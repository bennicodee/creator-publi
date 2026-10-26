using System.Buffers.Text;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using CreatorPubli.Api.Email;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CreatorPubli.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuth(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/auth").WithTags("Auth");
        // Rotas que recebem senha ou token: limite de tentativas por IP (política "auth" no Program.cs).
        var limited = g.MapGroup("").RequireRateLimiting("auth");

        limited.MapPost("/register", async (RegisterInput input, AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens) =>
        {
            var email = NormalizeEmail(input.Email);
            if (await db.Users.AnyAsync(u => u.Email == email))
                return Results.Problem("Já existe uma conta com esse e-mail.", statusCode: StatusCodes.Status409Conflict);

            var user = User.Create(input.Name.Trim(), email);
            user.PasswordHash = hasher.HashPassword(user, input.Password);
            db.Users.Add(user);
            await db.SaveChangesAsync();
            return Results.Ok(tokens.Issue(user));
        });

        limited.MapPost("/login", async (LoginInput input, AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens) =>
        {
            var email = NormalizeEmail(input.Email);
            var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
            if (user is { PasswordHash: null })
                return Results.Problem("Essa conta usa login com Google.", statusCode: StatusCodes.Status401Unauthorized);

            var result = user is null ? PasswordVerificationResult.Failed : hasher.VerifyHashedPassword(user, user.PasswordHash!, input.Password);
            if (result == PasswordVerificationResult.Failed)
                return Results.Problem("E-mail ou senha incorretos.", statusCode: StatusCodes.Status401Unauthorized);

            if (result == PasswordVerificationResult.SuccessRehashNeeded)
            {
                user!.PasswordHash = hasher.HashPassword(user, input.Password);
                await db.SaveChangesAsync();
            }
            return Results.Ok(tokens.Issue(user!));
        });

        limited.MapPost("/google", async (GoogleLoginInput input, AppDbContext db, GoogleOptions google, TokenService tokens) =>
        {
            if (string.IsNullOrEmpty(google.ClientId))
                return Results.Problem("Login com Google não configurado no servidor.", statusCode: StatusCodes.Status503ServiceUnavailable);

            GoogleJsonWebSignature.Payload payload;
            try
            {
                // Confere assinatura, emissor, validade e se o token foi emitido para o nosso Client ID.
                payload = await GoogleJsonWebSignature.ValidateAsync(input.Credential,
                    new GoogleJsonWebSignature.ValidationSettings { Audience = [google.ClientId] });
            }
            catch (HttpRequestException)
            {
                // Falha ao baixar as chaves públicas do Google para conferir a assinatura.
                return Results.Problem("Não foi possível falar com o Google. Tente de novo.", statusCode: StatusCodes.Status503ServiceUnavailable);
            }
            catch (Exception e) when (e is InvalidJwtException or FormatException or ArgumentException or Newtonsoft.Json.JsonException)
            {
                // Token malformado também chega aqui (a biblioteca lança FormatException, não InvalidJwtException).
                return Results.Problem("Token do Google inválido.", statusCode: StatusCodes.Status401Unauthorized);
            }
            if (!payload.EmailVerified)
                return Results.Problem("O e-mail da conta Google não está verificado.", statusCode: StatusCodes.Status401Unauthorized);

            var email = NormalizeEmail(payload.Email);
            var user = await db.Users.SingleOrDefaultAsync(u => u.GoogleSubject == payload.Subject)
                ?? await db.Users.SingleOrDefaultAsync(u => u.Email == email);
            if (user is null)
            {
                user = User.Create(payload.Name ?? email, email);
                db.Users.Add(user);
            }
            // Conta com senha e mesmo e-mail (verificado pelo Google) passa a aceitar os dois logins.
            user.GoogleSubject = payload.Subject;
            user.PictureUrl = payload.Picture ?? user.PictureUrl;
            await db.SaveChangesAsync();
            return Results.Ok(tokens.Issue(user));
        });

        // Sempre 204, exista ou não a conta: a resposta não revela quais e-mails estão cadastrados.
        limited.MapPost("/forgot-password", async (ForgotPasswordInput input, AppDbContext db, EmailQueue emails, FrontendOptions frontend) =>
        {
            var email = NormalizeEmail(input.Email);
            if (await db.Users.SingleOrDefaultAsync(u => u.Email == email) is { } user)
            {
                // Um pedido novo invalida os links anteriores que ainda não foram usados.
                await db.PasswordResetTokens.Where(t => t.UserId == user.Id && t.UsedAt == null).ExecuteDeleteAsync();

                var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));
                var now = DateTimeOffset.UtcNow;
                db.PasswordResetTokens.Add(new PasswordResetToken
                {
                    Id = Guid.CreateVersion7(),
                    UserId = user.Id,
                    TokenHash = HashToken(token),
                    CreatedAt = now,
                    ExpiresAt = now.AddMinutes(ResetLinkMinutes),
                });
                await db.SaveChangesAsync();

                var link = $"{frontend.BaseUrl.TrimEnd('/')}/#/redefinir-senha/{token}";
                emails.Enqueue(PasswordResetEmail.Build(user.Email, user.Name, link, ResetLinkMinutes));
            }
            return Results.NoContent();
        });

        // Troca a senha com o token do e-mail e já devolve a sessão (a pessoa entra direto no app).
        limited.MapPost("/reset-password", async (ResetPasswordInput input, AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens) =>
        {
            var hash = HashToken(input.Token);
            var reset = await db.PasswordResetTokens.SingleOrDefaultAsync(t => t.TokenHash == hash);
            if (reset is null || reset.UsedAt is not null || reset.ExpiresAt < DateTimeOffset.UtcNow ||
                await db.Users.FindAsync(reset.UserId) is not { } user)
                return Results.Problem("Esse link de redefinição é inválido ou expirou. Peça um novo em \"Esqueci minha senha\".",
                    statusCode: StatusCodes.Status400BadRequest);

            user.PasswordHash = hasher.HashPassword(user, input.NewPassword);
            reset.UsedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(tokens.Issue(user));
        });

        g.MapGet("/me", async (ClaimsPrincipal principal, AppDbContext db) =>
            await db.Users.FindAsync(principal.UserId()) is { } user ? Results.Ok(user.ToDto()) : Results.Unauthorized())
            .RequireAuthorization();

        var account = app.MapGroup("/api/account").WithTags("Minha conta").RequireAuthorization();
        var accountLimited = account.MapGroup("").RequireRateLimiting("auth");

        account.MapPut("/", async (AccountInput input, ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (await db.Users.FindAsync(principal.UserId()) is not { } user) return Results.Unauthorized();
            var email = NormalizeEmail(input.Email);
            if (email != user.Email && await db.Users.AnyAsync(u => u.Email == email))
                return Results.Problem("Já existe uma conta com esse e-mail.", statusCode: StatusCodes.Status409Conflict);
            user.Name = input.Name.Trim();
            user.Email = email;
            await db.SaveChangesAsync();
            return Results.Ok(user.ToDto());
        });

        accountLimited.MapPut("/password", async (ChangePasswordInput input, ClaimsPrincipal principal, AppDbContext db, IPasswordHasher<User> hasher) =>
        {
            if (await db.Users.FindAsync(principal.UserId()) is not { } user) return Results.Unauthorized();
            if (user.PasswordHash is not null &&
                hasher.VerifyHashedPassword(user, user.PasswordHash, input.CurrentPassword ?? "") == PasswordVerificationResult.Failed)
                return Results.Problem("A senha atual está incorreta.", statusCode: StatusCodes.Status400BadRequest);
            user.PasswordHash = hasher.HashPassword(user, input.NewPassword);
            await db.SaveChangesAsync();
            return Results.Ok(user.ToDto());
        });

        // POST em vez de DELETE porque a confirmação vai no corpo da requisição.
        accountLimited.MapPost("/delete", async (DeleteAccountInput input, ClaimsPrincipal principal, AppDbContext db, IPasswordHasher<User> hasher) =>
        {
            if (await db.Users.FindAsync(principal.UserId()) is not { } user) return Results.Unauthorized();
            var confirmed = user.PasswordHash is not null
                ? hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password ?? "") != PasswordVerificationResult.Failed
                : NormalizeEmail(input.Email ?? "") == user.Email;
            if (!confirmed)
                return Results.Problem(
                    user.PasswordHash is not null ? "Senha incorreta." : "O e-mail digitado não confere.",
                    statusCode: StatusCodes.Status400BadRequest);
            // As chaves estrangeiras com ON DELETE CASCADE apagam perfil, campanhas e todo o resto.
            await db.Users.Where(u => u.Id == user.Id).ExecuteDeleteAsync();
            return Results.NoContent();
        });
    }

    const int ResetLinkMinutes = 60;

    static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    static string HashToken(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
