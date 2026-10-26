namespace CreatorPubli.Api.Domain;

// Dados do creator usados no mídia kit e na nota fiscal (1:1 com User).
public class Profile
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string Bio { get; set; } = "";
    public string Niche { get; set; } = "";
    public string City { get; set; } = "";
    public string ContactEmail { get; set; } = "";
    public string ContactPhone { get; set; } = "";
    public string PhotoUrl { get; set; } = "";
    // Endereço do mídia kit público; nulo = não publicado.
    public string? PublicSlug { get; set; }
    public List<SocialAccount> Networks { get; set; } = [];

    // % do público feminino.
    public decimal AudienceFemale { get; set; }
    public string AudienceAge { get; set; } = "";
    public string AudienceCities { get; set; } = "";

    public decimal PriceReels { get; set; }
    public decimal PriceStories { get; set; }
    public decimal PriceTiktok { get; set; }
    public bool ShowCases { get; set; } = true;

    public string Cnpj { get; set; } = "";
    public string LegalName { get; set; } = "";
    public string Municipality { get; set; } = "";
    // Alíquota de ISS padrão em %.
    public decimal DefaultIssRate { get; set; } = 5;
}

public class SocialAccount
{
    public Network Network { get; set; }
    public string Handle { get; set; } = "";
    public int Followers { get; set; }
    // Taxa de engajamento média em %.
    public decimal Engagement { get; set; }
}

// Preferências de lembrete (1:1 com User). Padrões iguais a defaultSettings do frontend.
public class ReminderSettings
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = "";
    public string Whatsapp { get; set; } = "";
    public bool WhatsappEnabled { get; set; }
    public bool NotifyScript { get; set; } = true;
    public bool NotifyApproval { get; set; } = true;
    public bool NotifyPost { get; set; } = true;
    public bool NotifyPayment { get; set; } = true;
    // Quantos dias antes do prazo começar a avisar.
    public int DaysBefore { get; set; } = 2;
    public TimeOnly DigestTime { get; set; } = new(8, 0);
}
