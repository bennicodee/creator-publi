using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CreatorPubli.Api.Endpoints;

public record KitCaseDto(string Brand, long Views, decimal Engagement);

// O que a página pública do mídia kit mostra, no mesmo formato do Profile do frontend.
// Nada de CNPJ, valores fechados ou contatos das marcas.
public record PublicKitDto(
    string Name, string Bio, string Niche, string City, string ContactEmail, string ContactPhone, string PhotoUrl,
    Dictionary<Network, SocialAccountDto> Networks, decimal AudienceFemale, string AudienceAge, string AudienceCities,
    decimal PriceReels, decimal PriceStories, decimal PriceTiktok, List<KitCaseDto> Cases);

public static class PublicEndpoints
{
    public static void MapPublic(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/public/kit/{slug}", async (string slug, AppDbContext db) =>
        {
            var p = await db.Profiles.AsNoTracking().Include(x => x.Networks).SingleOrDefaultAsync(x => x.PublicSlug == slug);
            // Mídia kit é recurso do Plano Creator.
            if (p is null || await AccountEndpoints.ActiveSubscription(db, p.UserId) is null) return Results.NotFound();

            var cases = new List<KitCaseDto>();
            if (p.ShowCases)
            {
                var campaigns = await db.Campaigns.AsNoTracking()
                    .Where(c => c.UserId == p.UserId)
                    .Select(c => new { c.Brand, Metrics = c.Deliverables.Where(d => d.Metrics != null).Select(d => d.Metrics!).ToList() })
                    .ToListAsync();
                // Mesma regra de campaignResults() no frontend: soma as métricas e ordena por views.
                cases = [.. campaigns
                    .Where(c => c.Metrics.Count > 0)
                    .Select(c =>
                    {
                        var views = c.Metrics.Sum(m => m.Views);
                        var interactions = c.Metrics.Sum(m => m.Likes + m.Comments + m.Shares + m.Saves);
                        return new KitCaseDto(c.Brand, views, views > 0 ? Math.Round(interactions * 100m / views, 1) : 0);
                    })
                    .OrderByDescending(c => c.Views)
                    .Take(6)];
            }

            var profile = p.ToDto();
            return Results.Ok(new PublicKitDto(
                p.Name, p.Bio, p.Niche, p.City, p.ContactEmail, p.ContactPhone, p.PhotoUrl,
                profile.Networks, p.AudienceFemale, p.AudienceAge, p.AudienceCities,
                p.PriceReels, p.PriceStories, p.PriceTiktok, cases));
        }).WithTags("Público");
    }
}
