using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Domain;
using Microsoft.IdentityModel.Tokens;

namespace CreatorPubli.Api.Auth;

public class JwtOptions
{
    public string Issuer { get; set; } = "creatorpubli";
    public string Audience { get; set; } = "creatorpubli";
    // Chave HMAC com pelo menos 32 caracteres. Em produção, vem de variável de ambiente (Jwt__Key).
    public string Key { get; set; } = "";
    public int ExpiresInDays { get; set; } = 7;

    public SymmetricSecurityKey SigningKey() => new(Encoding.UTF8.GetBytes(Key));
}

public class GoogleOptions
{
    // Mesmo Client ID usado no frontend (VITE_GOOGLE_CLIENT_ID).
    public string ClientId { get; set; } = "";
}

public class TokenService(JwtOptions options)
{
    public AuthResponse Issue(User user)
    {
        var expires = DateTimeOffset.UtcNow.AddDays(options.ExpiresInDays);
        var token = new JwtSecurityToken(
            options.Issuer,
            options.Audience,
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.Name),
            ],
            expires: expires.UtcDateTime,
            signingCredentials: new SigningCredentials(options.SigningKey(), SecurityAlgorithms.HmacSha256));
        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expires, user.ToDto());
    }
}

public static class AuthExtensions
{
    public static Guid UserId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("Token sem claim sub."));
}

public static class Clock
{
    static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    // "Hoje" no fuso de Brasília, igual ao todayISO() do frontend para quem está no Brasil.
    public static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTime.UtcNow, Brasilia));
}
