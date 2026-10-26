namespace CreatorPubli.Api.Domain;

// Link de "esqueci minha senha". O token em si só existe no e-mail; aqui fica o SHA-256 dele.
public class PasswordResetToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
}
