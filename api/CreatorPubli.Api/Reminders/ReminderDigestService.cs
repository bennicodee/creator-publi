using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Email;
using Microsoft.EntityFrameworkCore;

namespace CreatorPubli.Api.Reminders;

// Resumo diário por e-mail: a cada poucos minutos, procura quem já passou do horário escolhido e
// ainda não recebeu o resumo hoje (fuso de Brasília). Sem nada pendente, não manda e-mail.
// Pensado para uma única instância da API, como na VPS.
public class ReminderDigestService(IServiceScopeFactory scopes, EmailQueue emails, FrontendOptions frontend, ILogger<ReminderDigestService> log)
    : BackgroundService
{
    static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);
    const int BatchSize = 100;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await RunOnceAsync(ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Falha ao processar os resumos diários.");
            }
        } while (await timer.WaitForNextTickAsync(ct));
    }

    public async Task RunOnceAsync(CancellationToken ct)
    {
        var now = Clock.Now;
        var today = DateOnly.FromDateTime(now);
        var time = TimeOnly.FromDateTime(now);
        var sent = 0;

        while (!ct.IsCancellationRequested)
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var users = await db.Users
                .Include(u => u.Settings)
                .Where(u => u.EmailVerifiedAt != null && u.Settings.Email != "" && u.Settings.DigestTime <= time &&
                            (u.Settings.LastDigestOn == null || u.Settings.LastDigestOn < today))
                .OrderBy(u => u.Id)
                .Take(BatchSize)
                .ToListAsync(ct);
            if (users.Count == 0) break;

            var ids = users.Select(u => u.Id).ToList();
            var campaigns = (await db.Campaigns.AsNoTracking()
                    .Include(c => c.Deliverables)
                    .Where(c => ids.Contains(c.UserId))
                    .ToListAsync(ct))
                .ToLookup(c => c.UserId);

            foreach (var user in users)
            {
                var reminders = ReminderBuilder.Build(campaigns[user.Id], today, user.Settings);
                if (reminders.Count > 0)
                {
                    emails.Enqueue(ReminderDigestEmail.Build(user.Email, user.CallName, reminders, frontend.BaseUrl));
                    sent++;
                }
                // Marca mesmo sem lembretes: só volta a olhar essa pessoa amanhã.
                user.Settings.LastDigestOn = today;
            }
            await db.SaveChangesAsync(ct);
        }

        if (sent > 0) log.LogInformation("{Count} resumo(s) diário(s) enfileirado(s).", sent);
    }
}
