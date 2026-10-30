using System.Security.Claims;
using System.Text.Json;
using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using CreatorPubli.Api.Email;
using CreatorPubli.Api.Payments;
using Microsoft.EntityFrameworkCore;

namespace CreatorPubli.Api.Endpoints;

// Plano Creator. Com MercadoPago:AccessToken configurado, a assinatura é paga no Mercado Pago e ativada
// pelo webhook (ou pela consulta ao voltar do pagamento); sem ele, é simulada e ativa na hora.
public static class PlanEndpoints
{
    const decimal PlanPrice = 11.99m;

    public static void MapPlan(this IEndpointRouteBuilder app)
    {
        var plan = app.MapGroup("/api/plan").WithTags("Plano").RequireAuthorization();

        plan.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, MercadoPagoClient mp, MercadoPagoOptions options,
            ILoggerFactory logs, CancellationToken ct) =>
        {
            var open = await OpenSubscription(db, principal.UserId());
            // Voltando do pagamento, o webhook pode ainda não ter chegado: consulta o Mercado Pago direto.
            if (open is { Status: SubscriptionStatus.Pending, ProviderId: { } id } && options.Enabled)
            {
                try
                {
                    Apply(open, await mp.GetSubscriptionAsync(id, ct));
                    await db.SaveChangesAsync(ct);
                }
                catch (Exception e) when (e is MercadoPagoException or HttpRequestException)
                {
                    logs.CreateLogger("Plano").LogWarning(e, "Não foi possível consultar a assinatura {Id} no Mercado Pago.", id);
                }
            }
            return ToDto(open, options);
        });

        plan.MapPost("/subscribe", async (ClaimsPrincipal principal, AppDbContext db, MercadoPagoClient mp, MercadoPagoOptions options,
            FrontendOptions frontend, ILoggerFactory logs, CancellationToken ct) =>
        {
            var userId = principal.UserId();
            var open = await OpenSubscription(db, userId);
            if (open is { Status: SubscriptionStatus.Authorized }) return Results.Ok(ToDto(open, options));
            if (options.TestMode)
                return Results.Problem("O Plano Creator abre para assinaturas em breve.", statusCode: StatusCodes.Status503ServiceUnavailable);

            if (!options.Enabled)
            {
                open ??= NewSubscription(db, userId);
                open.Status = SubscriptionStatus.Authorized;
                await db.SaveChangesAsync(ct);
                return Results.Ok(ToDto(open, options));
            }

            // Pagamento já iniciado e ainda pendente: retoma a mesma página do Mercado Pago.
            if (open is { Status: SubscriptionStatus.Pending, CheckoutUrl: not null }) return Results.Ok(ToDto(open, options));

            var user = await db.Users.SingleAsync(u => u.Id == userId, ct);
            var backUrl = options.BackUrl.Length > 0 ? options.BackUrl : $"{frontend.BaseUrl.TrimEnd('/')}/#/plano";
            Preapproval created;
            try
            {
                created = await mp.CreateSubscriptionAsync(userId.ToString(), user.Email, PlanPrice, backUrl, ct);
            }
            catch (Exception e) when (e is MercadoPagoException or HttpRequestException)
            {
                logs.CreateLogger("Plano").LogError(e, "Falha ao criar a assinatura no Mercado Pago.");
                return Results.Problem("Não foi possível iniciar o pagamento agora. Tente de novo em instantes.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            open ??= NewSubscription(db, userId);
            open.Status = SubscriptionStatus.Pending;
            open.ProviderId = created.Id;
            open.CheckoutUrl = created.InitPoint;
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToDto(open, options));
        });

        plan.MapPost("/cancel", async (ClaimsPrincipal principal, AppDbContext db, MercadoPagoClient mp, MercadoPagoOptions options,
            CancellationToken ct) =>
        {
            if (await OpenSubscription(db, principal.UserId()) is not { } open) return Results.Ok(ToDto(null, options));

            if (open.ProviderId is { } id && options.Enabled)
            {
                try
                {
                    await mp.CancelSubscriptionAsync(id, ct);
                }
                catch (Exception e) when (e is MercadoPagoException or HttpRequestException)
                {
                    // Sem cancelar no Mercado Pago, a cobrança mensal continuaria: não marca como cancelada.
                    return Results.Problem("Não foi possível cancelar no Mercado Pago agora. Tente de novo em instantes.",
                        statusCode: StatusCodes.Status502BadGateway);
                }
            }
            open.Status = SubscriptionStatus.Cancelled;
            open.CanceledAt = Clock.Today;
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToDto(null, options));
        });

        // Avisos do Mercado Pago (configure em Suas integrações > Webhooks, evento "Planos e assinaturas").
        app.MapPost("/api/webhooks/mercadopago", async (HttpRequest request, AppDbContext db, MercadoPagoClient mp,
            MercadoPagoOptions options, IHostEnvironment env, ILoggerFactory logs, CancellationToken ct) =>
        {
            var log = logs.CreateLogger("Webhook Mercado Pago");
            if (!options.Enabled) return Results.NotFound();

            using var body = await JsonDocument.ParseAsync(request.Body, cancellationToken: ct);
            var root = body.RootElement;
            var type = request.Query["type"].FirstOrDefault()
                ?? (root.TryGetProperty("type", out var t) ? t.GetString() : null);
            var dataId = request.Query["data.id"].FirstOrDefault()
                ?? (root.TryGetProperty("data", out var d) && d.TryGetProperty("id", out var i) ? i.ToString() : "");

            var signed = MercadoPagoWebhook.IsValid(request.Headers["x-signature"], request.Headers["x-request-id"], dataId ?? "", options.WebhookSecret);
            // Sem chave secreta configurada, só aceita em desenvolvimento.
            if (!signed && !(env.IsDevelopment() && options.WebhookSecret.Length == 0))
            {
                log.LogWarning("Webhook com assinatura inválida recusado (tipo {Type}).", type);
                return Results.Unauthorized();
            }

            if (type != "subscription_preapproval" || string.IsNullOrEmpty(dataId)) return Results.Ok();

            // Não confia no corpo do aviso: busca o estado atual direto no Mercado Pago.
            var current = await mp.GetSubscriptionAsync(dataId, ct);
            var sub = await db.Subscriptions.SingleOrDefaultAsync(s => s.ProviderId == current.Id, ct);
            if (sub is null)
            {
                log.LogWarning("Assinatura {Id} do Mercado Pago não encontrada no banco.", current.Id);
                return Results.Ok();
            }

            Apply(sub, current);
            await db.SaveChangesAsync(ct);
            log.LogInformation("Assinatura {Id} atualizada para {Status}.", current.Id, sub.Status);
            return Results.Ok();
        }).AllowAnonymous().ExcludeFromDescription();
    }

    public static Task<Subscription?> OpenSubscription(AppDbContext db, Guid userId) =>
        db.Subscriptions.SingleOrDefaultAsync(s => s.UserId == userId && s.CanceledAt == null);

    public static async Task<bool> HasActivePlan(AppDbContext db, Guid userId) =>
        await OpenSubscription(db, userId) is { IsActive: true };

    static Subscription NewSubscription(AppDbContext db, Guid userId)
    {
        var sub = new Subscription { Id = Guid.CreateVersion7(), UserId = userId, StartedAt = Clock.Today, MonthlyPrice = PlanPrice };
        db.Subscriptions.Add(sub);
        return sub;
    }

    // Traduz o status do Mercado Pago para o nosso.
    static void Apply(Subscription sub, Preapproval mp)
    {
        var status = mp.Status switch
        {
            "authorized" => SubscriptionStatus.Authorized,
            "paused" => SubscriptionStatus.Paused,
            "cancelled" => SubscriptionStatus.Cancelled,
            _ => SubscriptionStatus.Pending,
        };
        if (status == SubscriptionStatus.Authorized && sub.Status != SubscriptionStatus.Authorized)
            sub.StartedAt = Clock.Today;
        sub.Status = status;
        if (status == SubscriptionStatus.Cancelled) sub.CanceledAt ??= Clock.Today;
    }

    static PlanDto ToDto(Subscription? s, MercadoPagoOptions options)
    {
        var open = s is { CanceledAt: null } ? s : null;
        return new PlanDto(
            open is { IsActive: true },
            open is { IsActive: true } ? open.StartedAt : null,
            open?.MonthlyPrice ?? PlanPrice,
            open is null ? "none" : open.Status.ToString().ToLowerInvariant(),
            options.Enabled,
            open is { Status: SubscriptionStatus.Pending } ? open.CheckoutUrl : null,
            !options.TestMode);
    }
}
