using System.Security.Claims;
using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CreatorPubli.Api.Endpoints;

public static class AccountEndpoints
{
    const decimal PlanPrice = 11.99m;

    public static void MapAccount(this IEndpointRouteBuilder app)
    {
        var profile = app.MapGroup("/api/profile").WithTags("Perfil").RequireAuthorization();

        profile.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
            (await LoadProfile(db, principal)).ToDto());

        profile.MapPut("/", async (ProfileDto input, ClaimsPrincipal principal, AppDbContext db) =>
        {
            var p = await LoadProfile(db, principal);
            if (!string.IsNullOrWhiteSpace(input.PublicSlug) &&
                await db.Profiles.AnyAsync(x => x.PublicSlug == input.PublicSlug && x.UserId != p.UserId))
                return Results.Problem("Esse endereço de mídia kit já está em uso.", statusCode: StatusCodes.Status409Conflict);
            p.Apply(input);
            await db.SaveChangesAsync();
            return Results.Ok(p.ToDto());
        });

        var settings = app.MapGroup("/api/settings").WithTags("Lembretes").RequireAuthorization();

        settings.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
            (await db.ReminderSettings.SingleAsync(s => s.UserId == principal.UserId())).ToDto());

        settings.MapPut("/", async (ReminderSettingsDto input, ClaimsPrincipal principal, AppDbContext db) =>
        {
            var s = await db.ReminderSettings.SingleAsync(x => x.UserId == principal.UserId());
            s.Apply(input);
            await db.SaveChangesAsync();
            return s.ToDto();
        });

        // Assinatura simulada, como no frontend: ainda não há cobrança de verdade.
        var plan = app.MapGroup("/api/plan").WithTags("Plano").RequireAuthorization();

        plan.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
            ToPlanDto(await ActiveSubscription(db, principal.UserId())));

        plan.MapPost("/subscribe", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userId = principal.UserId();
            var active = await ActiveSubscription(db, userId);
            if (active is null)
            {
                active = new Subscription { Id = Guid.CreateVersion7(), UserId = userId, StartedAt = Clock.Today, MonthlyPrice = PlanPrice };
                db.Subscriptions.Add(active);
                await db.SaveChangesAsync();
            }
            return ToPlanDto(active);
        });

        plan.MapPost("/cancel", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (await ActiveSubscription(db, principal.UserId()) is { } active)
            {
                active.CanceledAt = Clock.Today;
                await db.SaveChangesAsync();
            }
            return ToPlanDto(null);
        });
    }

    static Task<Profile> LoadProfile(AppDbContext db, ClaimsPrincipal principal) =>
        db.Profiles.Include(p => p.Networks).SingleAsync(p => p.UserId == principal.UserId());

    public static Task<Subscription?> ActiveSubscription(AppDbContext db, Guid userId) =>
        db.Subscriptions.SingleOrDefaultAsync(s => s.UserId == userId && s.CanceledAt == null);

    static PlanDto ToPlanDto(Subscription? s) => new(s is not null, s?.StartedAt, s?.MonthlyPrice ?? PlanPrice);
}
