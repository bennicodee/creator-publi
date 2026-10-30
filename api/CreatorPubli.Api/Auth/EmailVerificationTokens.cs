using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using CreatorPubli.Api.Domain;

namespace CreatorPubli.Api.Auth;

// Link de confirmação de e-mail sem tabela no banco: "<dados>.<assinatura>", com os dados
// (usuário, e-mail, validade) assinados por HMAC. Trocar o e-mail da conta invalida o link antigo.
public class EmailVerificationTokens(JwtOptions options)
{
    public const int ValidHours = 48;

    // Chave derivada da do JWT, com propósito próprio: um token não serve no lugar do outro.
    readonly byte[] key = SHA256.HashData(Encoding.UTF8.GetBytes("email-verification:" + options.Key));

    public string Create(User user, DateTimeOffset now)
    {
        var data = Encoding.UTF8.GetBytes($"{user.Id:N}|{now.AddHours(ValidHours).ToUnixTimeSeconds()}|{user.Email}");
        return $"{Base64Url.EncodeToString(data)}.{Base64Url.EncodeToString(HMACSHA256.HashData(key, data))}";
    }

    // Devolve o usuário e o e-mail do link, ou null se o link for inválido ou tiver expirado.
    public (Guid UserId, string Email)? Read(string token, DateTimeOffset now)
    {
        var parts = token.Split('.');
        if (parts.Length != 2) return null;
        byte[] data, signature;
        try
        {
            data = Base64Url.DecodeFromChars(parts[0]);
            signature = Base64Url.DecodeFromChars(parts[1]);
        }
        catch (FormatException)
        {
            return null;
        }
        if (!CryptographicOperations.FixedTimeEquals(HMACSHA256.HashData(key, data), signature)) return null;

        var fields = Encoding.UTF8.GetString(data).Split('|', 3);
        if (fields.Length != 3 || !Guid.TryParseExact(fields[0], "N", out var userId) || !long.TryParse(fields[1], out var expires))
            return null;
        if (DateTimeOffset.FromUnixTimeSeconds(expires) < now) return null;
        return (userId, fields[2]);
    }
}
