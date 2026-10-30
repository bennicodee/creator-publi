using System.ComponentModel.DataAnnotations;
using CreatorPubli.Api.Domain;

namespace CreatorPubli.Api.Contracts;

// ---------- auth ----------

public record RegisterInput([Required, MaxLength(120)] string Name, [Required(ErrorMessage = "Informe o e-mail."), EmailAddress(ErrorMessage = "Digite um e-mail válido."), MaxLength(254)] string Email, [Required, MinLength(6, ErrorMessage = "A senha precisa ter pelo menos 6 caracteres."), MaxLength(128)] string Password, [MaxLength(40, ErrorMessage = "O apelido pode ter até 40 caracteres.")] string? Nickname = null);

public record LoginInput([Required] string Email, [Required] string Password);

// ID token (credential) devolvido pelo botão do Google Identity Services.
public record GoogleLoginInput([Required] string Credential);

public record UserDto(Guid Id, string Name, string Nickname, string Email, bool EmailVerified, string Provider, string? Picture, bool HasPassword, bool GoogleLinked);

// Token do link do e-mail de confirmação.
public record VerifyEmailInput([Required] string Token);

public record AuthResponse(string Token, DateTimeOffset ExpiresAt, UserDto User);

// ---------- minha conta ----------

public record AccountInput([Required(ErrorMessage = "Informe o nome."), MaxLength(120)] string Name, [Required(ErrorMessage = "Informe o e-mail."), EmailAddress(ErrorMessage = "Digite um e-mail válido."), MaxLength(254)] string Email, [MaxLength(40, ErrorMessage = "O apelido pode ter até 40 caracteres.")] string? Nickname = null);

// CurrentPassword é obrigatória quando a conta já tem senha; contas só com Google podem criar uma.
public record ChangePasswordInput(string? CurrentPassword, [Required, MinLength(6, ErrorMessage = "A nova senha precisa ter pelo menos 6 caracteres."), MaxLength(128)] string NewPassword);

// Contas com senha confirmam com a senha; contas só com Google confirmam digitando o e-mail.
public record DeleteAccountInput(string? Password, string? Email);

// ---------- esqueci minha senha ----------

public record ForgotPasswordInput([Required(ErrorMessage = "Informe o e-mail."), EmailAddress(ErrorMessage = "Digite um e-mail válido.")] string Email);

public record ResetPasswordInput([Required] string Token, [Required, MinLength(6, ErrorMessage = "A nova senha precisa ter pelo menos 6 caracteres."), MaxLength(128)] string NewPassword);

// ---------- perfil ----------

public record SocialAccountDto([MaxLength(60)] string Handle, [Range(0, int.MaxValue)] int Followers, [Range(0, 100)] decimal Engagement);

// Mesmo formato de Profile em src/types.ts, mais o slug do mídia kit público.
public record ProfileDto(
    [Required, MaxLength(120)] string Name,
    [MaxLength(1000)] string Bio,
    [MaxLength(120)] string Niche,
    [MaxLength(120)] string City,
    [MaxLength(254)] string ContactEmail,
    [MaxLength(30)] string ContactPhone,
    [MaxLength(500)] string PhotoUrl,
    [RegularExpression("^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$")] string? PublicSlug,
    Dictionary<Network, SocialAccountDto> Networks,
    [Range(0, 100)] decimal AudienceFemale,
    [MaxLength(60)] string AudienceAge,
    [MaxLength(300)] string AudienceCities,
    [Range(0, 9_999_999)] decimal PriceReels,
    [Range(0, 9_999_999)] decimal PriceStories,
    [Range(0, 9_999_999)] decimal PriceTiktok,
    bool ShowCases,
    [MaxLength(18)] string Cnpj,
    [MaxLength(200)] string LegalName,
    [MaxLength(120)] string Municipality,
    [Range(0, 100)] decimal DefaultIssRate);

public record ReminderSettingsDto(
    [MaxLength(254)] string Email,
    [MaxLength(30)] string Whatsapp,
    bool WhatsappEnabled,
    bool NotifyScript,
    bool NotifyApproval,
    bool NotifyPost,
    bool NotifyPayment,
    [Range(0, 30)] int DaysBefore,
    TimeOnly DigestTime);

// Status: none, pending (pagamento iniciado), authorized (ativo), paused. CheckoutUrl: retomar pagamento pendente.
// SubscriptionsOpen: false enquanto o Mercado Pago está em modo teste (botão "em breve").
public record PlanDto(bool Active, DateOnly? Since, decimal MonthlyPrice, string Status, bool PaymentsEnabled, string? CheckoutUrl, bool SubscriptionsOpen);

public static class AccountMapping
{
    public static UserDto ToDto(this User u) =>
        new(u.Id, u.Name, u.Nickname, u.Email, u.EmailVerifiedAt is not null, u.PasswordHash is null ? "google" : "senha", u.PictureUrl, u.PasswordHash is not null, u.GoogleSubject is not null);

    public static ProfileDto ToDto(this Profile p) => new(
        p.Name, p.Bio, p.Niche, p.City, p.ContactEmail, p.ContactPhone, p.PhotoUrl, p.PublicSlug,
        // Sempre devolve as três redes, como o Record<Network, SocialAccount> do frontend.
        Enum.GetValues<Network>().ToDictionary(n => n, n => p.Networks.FirstOrDefault(a => a.Network == n) is { } a
            ? new SocialAccountDto(a.Handle, a.Followers, a.Engagement)
            : new SocialAccountDto("", 0, 0)),
        p.AudienceFemale, p.AudienceAge, p.AudienceCities, p.PriceReels, p.PriceStories, p.PriceTiktok,
        p.ShowCases, p.Cnpj, p.LegalName, p.Municipality, p.DefaultIssRate);

    public static void Apply(this Profile p, ProfileDto d)
    {
        p.Name = d.Name.Trim();
        p.Bio = d.Bio;
        p.Niche = d.Niche;
        p.City = d.City;
        p.ContactEmail = d.ContactEmail;
        p.ContactPhone = d.ContactPhone;
        p.PhotoUrl = d.PhotoUrl;
        p.PublicSlug = string.IsNullOrWhiteSpace(d.PublicSlug) ? null : d.PublicSlug;
        p.AudienceFemale = d.AudienceFemale;
        p.AudienceAge = d.AudienceAge;
        p.AudienceCities = d.AudienceCities;
        p.PriceReels = d.PriceReels;
        p.PriceStories = d.PriceStories;
        p.PriceTiktok = d.PriceTiktok;
        p.ShowCases = d.ShowCases;
        p.Cnpj = d.Cnpj;
        p.LegalName = d.LegalName;
        p.Municipality = d.Municipality;
        p.DefaultIssRate = d.DefaultIssRate;

        foreach (var (network, dto) in d.Networks)
        {
            var account = p.Networks.FirstOrDefault(a => a.Network == network);
            if (account is null) p.Networks.Add(account = new SocialAccount { Network = network });
            account.Handle = dto.Handle;
            account.Followers = dto.Followers;
            account.Engagement = dto.Engagement;
        }
    }

    public static ReminderSettingsDto ToDto(this ReminderSettings s) => new(
        s.Email, s.Whatsapp, s.WhatsappEnabled, s.NotifyScript, s.NotifyApproval, s.NotifyPost,
        s.NotifyPayment, s.DaysBefore, s.DigestTime);

    public static void Apply(this ReminderSettings s, ReminderSettingsDto d)
    {
        s.Email = d.Email;
        s.Whatsapp = d.Whatsapp;
        s.WhatsappEnabled = d.WhatsappEnabled;
        s.NotifyScript = d.NotifyScript;
        s.NotifyApproval = d.NotifyApproval;
        s.NotifyPost = d.NotifyPost;
        s.NotifyPayment = d.NotifyPayment;
        s.DaysBefore = d.DaysBefore;
        s.DigestTime = d.DigestTime;
    }
}
