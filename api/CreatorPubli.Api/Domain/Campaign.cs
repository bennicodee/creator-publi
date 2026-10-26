namespace CreatorPubli.Api.Domain;

public class Campaign
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string Brand { get; set; } = "";
    public string Agency { get; set; } = "";
    public string ContactEmail { get; set; } = "";
    public string ContactPhone { get; set; } = "";

    public decimal Value { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Pix;
    public DateOnly? PaymentDueDate { get; set; }
    public DateOnly? PaidAt { get; set; }
    public DateOnly? ClosedAt { get; set; }
    public CampaignStatus Status { get; set; } = CampaignStatus.Proposta;

    public string Briefing { get; set; } = "";
    public string BriefingLink { get; set; } = "";
    public string CouponCode { get; set; } = "";
    public string CouponDiscount { get; set; } = "";
    public string CouponLink { get; set; } = "";
    public string Notes { get; set; } = "";
    // Gerado pelo assistente (Plano Creator).
    public string Script { get; set; } = "";

    public List<Deliverable> Deliverables { get; set; } = [];
    public List<ChecklistItem> Checklist { get; set; } = [];
    public Invoice? Invoice { get; set; }

    public DateOnly CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    // Fechada em diante = dinheiro comprometido.
    public bool IsClosed => Status >= CampaignStatus.Fechada;

    // Mantém ClosedAt/PaidAt coerentes com o status (mesma regra do normalize() do frontend).
    public void Normalize(DateOnly today)
    {
        ClosedAt = IsClosed ? ClosedAt ?? today : null;
        PaidAt = Status == CampaignStatus.Paga ? PaidAt ?? today : null;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}

public class Deliverable
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    // Ordem de exibição dentro da campanha.
    public int Position { get; set; }

    public DeliverableType Type { get; set; } = DeliverableType.Reels;
    public int Quantity { get; set; } = 1;
    public string Description { get; set; } = "";
    public DateOnly? ScriptDue { get; set; }
    public DateOnly? ApprovalDue { get; set; }
    public DateOnly? PostDate { get; set; }
    public bool ScriptSent { get; set; }
    public bool Approved { get; set; }
    public bool Posted { get; set; }
    // Link do post publicado (Plano Creator).
    public string PostUrl { get; set; } = "";
    public PostMetrics? Metrics { get; set; }
}

public class PostMetrics
{
    public long Views { get; set; }
    public long Likes { get; set; }
    public long Comments { get; set; }
    public long Shares { get; set; }
    public long Saves { get; set; }
}

public class ChecklistItem
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int Position { get; set; }
    public string Text { get; set; } = "";
    public bool Done { get; set; }
}

public class Invoice
{
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Rascunho;
    public string Number { get; set; } = "";
    public DateOnly? IssuedAt { get; set; }
    public string TakerName { get; set; } = "";
    public string TakerDoc { get; set; } = "";
    public string TakerEmail { get; set; } = "";
    public string TakerAddress { get; set; } = "";
    public string Description { get; set; } = "";
    // Alíquota de ISS em %.
    public decimal IssRate { get; set; }
}
