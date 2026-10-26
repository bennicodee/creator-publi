using System.Security.Claims;
using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CreatorPubli.Api.Endpoints;

public static class CampaignEndpoints
{
    public static void MapCampaigns(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/campaigns").WithTags("Campanhas").RequireAuthorization();

        g.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var campaigns = await Owned(db, principal).OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id).ToListAsync();
            return campaigns.Select(c => c.ToDto());
        });

        g.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db) =>
            await Find(db, principal, id) is { } c ? Results.Ok(c.ToDto()) : Results.NotFound());

        g.MapPost("/", async (CampaignInput input, ClaimsPrincipal principal, AppDbContext db) =>
        {
            var today = Clock.Today;
            var campaign = new Campaign { Id = Guid.CreateVersion7(), UserId = principal.UserId(), CreatedAt = today };
            campaign.Apply(input, today);
            db.Campaigns.Add(campaign);
            await db.SaveChangesAsync();
            return Results.Created($"/api/campaigns/{campaign.Id}", campaign.ToDto());
        });

        g.MapPut("/{id:guid}", async (Guid id, CampaignInput input, ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (await Find(db, principal, id) is not { } campaign) return Results.NotFound();
            campaign.Apply(input, Clock.Today);
            await db.SaveChangesAsync();
            return Results.Ok(campaign.ToDto());
        });

        g.MapPatch("/{id:guid}/status", async (Guid id, StatusInput input, ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (await Find(db, principal, id) is not { } campaign) return Results.NotFound();
            campaign.Status = input.Status;
            campaign.Normalize(Clock.Today);
            await db.SaveChangesAsync();
            return Results.Ok(campaign.ToDto());
        });

        g.MapPatch("/{id:guid}/deliverables/{deliverableId:guid}",
            async (Guid id, Guid deliverableId, DeliverablePatch patch, ClaimsPrincipal principal, AppDbContext db) =>
            {
                if (await Find(db, principal, id) is not { } campaign) return Results.NotFound();
                if (campaign.Deliverables.FirstOrDefault(d => d.Id == deliverableId) is not { } d) return Results.NotFound();
                if (patch.ScriptSent is { } scriptSent) d.ScriptSent = scriptSent;
                if (patch.Approved is { } approved) d.Approved = approved;
                if (patch.Posted is { } posted) d.Posted = posted;
                if (patch.PostUrl is { } postUrl) d.PostUrl = postUrl;
                if (patch.Metrics is { } metrics) d.Metrics = metrics.ToEntity();
                campaign.UpdatedAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync();
                return Results.Ok(d.ToDto());
            });

        g.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db) =>
            await Owned(db, principal).Where(c => c.Id == id).ExecuteDeleteAsync() > 0 ? Results.NoContent() : Results.NotFound());

        // "Começar do zero" no frontend.
        g.MapDelete("/", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            await Owned(db, principal).ExecuteDeleteAsync();
            return Results.NoContent();
        });
    }

    static IQueryable<Campaign> Owned(AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.UserId();
        return db.Campaigns
            .Include(c => c.Deliverables)
            .Include(c => c.Checklist)
            .AsSplitQuery()
            .Where(c => c.UserId == userId);
    }

    static Task<Campaign?> Find(AppDbContext db, ClaimsPrincipal principal, Guid id) =>
        Owned(db, principal).SingleOrDefaultAsync(c => c.Id == id);
}
