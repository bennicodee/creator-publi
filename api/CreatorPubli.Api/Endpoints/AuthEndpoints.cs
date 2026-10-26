using System.Security.Claims;
using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CreatorPubli.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuth(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/auth").WithTags("Auth");

        g.MapPost("/register", async (RegisterInput input, AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens) =>
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

        g.MapPost("/login", async (LoginInput input, AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens) =>
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

        g.MapPost("/google", async (GoogleLoginInput input, AppDbContext db, GoogleOptions google, TokenService tokens) =>
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

        g.MapGet("/me", async (ClaimsPrincipal principal, AppDbContext db) =>
            await db.Users.FindAsync(principal.UserId()) is { } user ? Results.Ok(user.ToDto()) : Results.Unauthorized())
            .RequireAuthorization();

        var account = app.MapGroup("/api/account").WithTags("Minha conta").RequireAuthorization();

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

        account.MapPut("/password", async (ChangePasswordInput input, ClaimsPrincipal principal, AppDbContext db, IPasswordHasher<User> hasher) =>
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
        account.MapPost("/delete", async (DeleteAccountInput input, ClaimsPrincipal principal, AppDbContext db, IPasswordHasher<User> hasher) =>
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

    static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
