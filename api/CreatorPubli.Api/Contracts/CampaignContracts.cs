using System.ComponentModel.DataAnnotations;
using CreatorPubli.Api.Domain;

namespace CreatorPubli.Api.Contracts;

// Mesmo formato de Campaign/Deliverable/Invoice em src/types.ts, com datas
// "YYYY-MM-DD" ou null (o frontend usa "" para "sem data").

public record PostMetricsDto(
    [Range(0, long.MaxValue)] long Views,
    [Range(0, long.MaxValue)] long Likes,
    [Range(0, long.MaxValue)] long Comments,
    [Range(0, long.MaxValue)] long Shares,
    [Range(0, long.MaxValue)] long Saves);

public record DeliverableDto(
    Guid? Id,
    DeliverableType Type,
    [Range(1, 1000)] int Quantity,
    [MaxLength(500)] string Description,
    DateOnly? ScriptDue,
    DateOnly? ApprovalDue,
    DateOnly? PostDate,
    bool ScriptSent,
    bool Approved,
    bool Posted,
    [MaxLength(500)] string PostUrl,
    PostMetricsDto? Metrics);

public record ChecklistItemDto(Guid? Id, [MaxLength(300)] string Text, bool Done);

public record InvoiceDto(
    InvoiceStatus Status,
    [MaxLength(40)] string Number,
    DateOnly? IssuedAt,
    [MaxLength(200)] string TakerName,
    [MaxLength(20)] string TakerDoc,
    [MaxLength(254)] string TakerEmail,
    [MaxLength(300)] string TakerAddress,
    [MaxLength(2000)] string Description,
    [Range(0, 100)] decimal IssRate);

// Corpo de POST/PUT: a campanha inteira, como o save() do frontend envia.
public record CampaignInput(
    [Required, MaxLength(120)] string Brand,
    [MaxLength(120)] string Agency,
    [MaxLength(120)] string ContactName,
    [MaxLength(254)] string ContactEmail,
    [MaxLength(30)] string ContactPhone,
    [Range(0, 9_999_999_999)] decimal Value,
    PaymentMethod PaymentMethod,
    DateOnly? PaymentDueDate,
    DateOnly? PaidAt,
    DateOnly? ClosedAt,
    CampaignStatus Status,
    [MaxLength(20_000)] string Briefing,
    [MaxLength(500)] string BriefingLink,
    [MaxLength(60)] string CouponCode,
    [MaxLength(60)] string CouponDiscount,
    [MaxLength(500)] string CouponLink,
    [MaxLength(5000)] string Notes,
    [MaxLength(20_000)] string Script,
    List<DeliverableDto> Deliverables,
    List<ChecklistItemDto> Checklist,
    InvoiceDto? Invoice);

public record CampaignDto(
    Guid Id,
    string Brand,
    string Agency,
    string ContactName,
    string ContactEmail,
    string ContactPhone,
    decimal Value,
    PaymentMethod PaymentMethod,
    DateOnly? PaymentDueDate,
    DateOnly? PaidAt,
    DateOnly? ClosedAt,
    CampaignStatus Status,
    string Briefing,
    string BriefingLink,
    string CouponCode,
    string CouponDiscount,
    string CouponLink,
    string Notes,
    string Script,
    List<DeliverableDto> Deliverables,
    List<ChecklistItemDto> Checklist,
    InvoiceDto? Invoice,
    DateOnly CreatedAt);

public record StatusInput(CampaignStatus Status);

// PATCH de um entregável: só os campos enviados mudam (marcar etapa, link, métricas).
public record DeliverablePatch(bool? ScriptSent, bool? Approved, bool? Posted, [MaxLength(500)] string? PostUrl, PostMetricsDto? Metrics);

public static class CampaignMapping
{
    public static CampaignDto ToDto(this Campaign c) => new(
        c.Id, c.Brand, c.Agency, c.ContactName, c.ContactEmail, c.ContactPhone, c.Value, c.PaymentMethod,
        c.PaymentDueDate, c.PaidAt, c.ClosedAt, c.Status, c.Briefing, c.BriefingLink, c.CouponCode,
        c.CouponDiscount, c.CouponLink, c.Notes, c.Script,
        [.. c.Deliverables.OrderBy(d => d.Position).Select(ToDto)],
        [.. c.Checklist.OrderBy(i => i.Position).Select(i => new ChecklistItemDto(i.Id, i.Text, i.Done))],
        c.Invoice is { } inv ? new InvoiceDto(inv.Status, inv.Number, inv.IssuedAt, inv.TakerName, inv.TakerDoc,
            inv.TakerEmail, inv.TakerAddress, inv.Description, inv.IssRate) : null,
        c.CreatedAt);

    public static DeliverableDto ToDto(this Deliverable d) => new(
        d.Id, d.Type, d.Quantity, d.Description, d.ScriptDue, d.ApprovalDue, d.PostDate,
        d.ScriptSent, d.Approved, d.Posted, d.PostUrl, d.Metrics?.ToDto());

    public static PostMetricsDto ToDto(this PostMetrics m) => new(m.Views, m.Likes, m.Comments, m.Shares, m.Saves);

    public static PostMetrics ToEntity(this PostMetricsDto m) =>
        new() { Views = m.Views, Likes = m.Likes, Comments = m.Comments, Shares = m.Shares, Saves = m.Saves };

    // Copia o input para a entidade, preservando os ids de entregáveis e itens que já existem.
    public static void Apply(this Campaign c, CampaignInput i, DateOnly today)
    {
        c.Brand = i.Brand.Trim();
        c.Agency = i.Agency;
        c.ContactName = i.ContactName;
        c.ContactEmail = i.ContactEmail;
        c.ContactPhone = i.ContactPhone;
        c.Value = i.Value;
        c.PaymentMethod = i.PaymentMethod;
        c.PaymentDueDate = i.PaymentDueDate;
        c.PaidAt = i.PaidAt;
        c.ClosedAt = i.ClosedAt;
        c.Status = i.Status;
        c.Briefing = i.Briefing;
        c.BriefingLink = i.BriefingLink;
        c.CouponCode = i.CouponCode;
        c.CouponDiscount = i.CouponDiscount;
        c.CouponLink = i.CouponLink;
        c.Notes = i.Notes;
        c.Script = i.Script;

        Sync(c.Deliverables, i.Deliverables, d => d.Id, dto => dto.Id, () => new Deliverable { Id = Guid.CreateVersion7() }, (d, dto, pos) =>
        {
            d.Position = pos;
            d.Type = dto.Type;
            d.Quantity = dto.Quantity;
            d.Description = dto.Description;
            d.ScriptDue = dto.ScriptDue;
            d.ApprovalDue = dto.ApprovalDue;
            d.PostDate = dto.PostDate;
            d.ScriptSent = dto.ScriptSent;
            d.Approved = dto.Approved;
            d.Posted = dto.Posted;
            d.PostUrl = dto.PostUrl;
            d.Metrics = dto.Metrics?.ToEntity();
        });

        Sync(c.Checklist, i.Checklist, x => x.Id, dto => dto.Id, () => new ChecklistItem { Id = Guid.CreateVersion7() }, (x, dto, pos) =>
        {
            x.Position = pos;
            x.Text = dto.Text;
            x.Done = dto.Done;
        });

        c.Invoice = i.Invoice is { } inv
            ? new Invoice
            {
                Status = inv.Status, Number = inv.Number, IssuedAt = inv.IssuedAt, TakerName = inv.TakerName,
                TakerDoc = inv.TakerDoc, TakerEmail = inv.TakerEmail, TakerAddress = inv.TakerAddress,
                Description = inv.Description, IssRate = inv.IssRate,
            }
            : null;

        c.Normalize(today);
    }

    // Atualiza os itens com id conhecido, cria os novos e remove os que não vieram.
    static void Sync<T, TDto>(List<T> items, List<TDto> dtos, Func<T, Guid> key, Func<TDto, Guid?> dtoKey, Func<T> create, Action<T, TDto, int> apply)
    {
        var byId = items.ToDictionary(key);
        var kept = new List<T>();
        for (var pos = 0; pos < dtos.Count; pos++)
        {
            var dto = dtos[pos];
            if (dtoKey(dto) is not { } id || !byId.TryGetValue(id, out var item))
                item = create();
            apply(item, dto, pos);
            kept.Add(item);
        }
        items.Clear();
        items.AddRange(kept);
    }
}
