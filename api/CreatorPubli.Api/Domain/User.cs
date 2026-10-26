namespace CreatorPubli.Api.Domain;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    // Sempre em minúsculas; único.
    public string Email { get; set; } = "";
    // Hash PBKDF2 (ASP.NET Identity); nulo em contas só com Google.
    public string? PasswordHash { get; set; }
    // Claim "sub" do Google; único quando presente.
    public string? GoogleSubject { get; set; }
    public string? PictureUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Profile Profile { get; set; } = null!;
    public ReminderSettings Settings { get; set; } = null!;
    public List<Subscription> Subscriptions { get; set; } = [];
    public List<Campaign> Campaigns { get; set; } = [];

    public static User Create(string name, string email) => new()
    {
        Id = Guid.CreateVersion7(),
        Name = name,
        Email = email,
        CreatedAt = DateTimeOffset.UtcNow,
        Profile = new Profile { Name = name, ContactEmail = email },
        Settings = new ReminderSettings { Email = email },
    };
}

// Plano Creator. "Aberta" = sem CanceledAt (no máximo uma por usuário); só libera os recursos
// quando Authorized. Cancelamentos ficam no histórico.
public class Subscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly StartedAt { get; set; }
    public DateOnly? CanceledAt { get; set; }
    public decimal MonthlyPrice { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Authorized;
    // Id da assinatura ("preapproval") no Mercado Pago; nulo na assinatura simulada.
    public string? ProviderId { get; set; }
    // Página de pagamento do Mercado Pago, para retomar uma assinatura pendente.
    public string? CheckoutUrl { get; set; }

    public bool IsActive => CanceledAt is null && Status == SubscriptionStatus.Authorized;
}
