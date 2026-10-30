using CreatorPubli.Api.Domain;

namespace CreatorPubli.Api.Reminders;

public enum ReminderSeverity { Atrasado, Hoje, Proximo }

public record Reminder(ReminderSeverity Severity, DateOnly Date, string Text, Guid CampaignId);

// Mesma regra de buildReminders() em src/lib/schedule.ts: o e-mail mostra o que a tela de Lembretes mostra.
public static class ReminderBuilder
{
    static readonly Dictionary<DeliverableType, string> TypeLabel = new()
    {
        [DeliverableType.Reels] = "Reels",
        [DeliverableType.Stories] = "Stories",
        [DeliverableType.Feed] = "Post feed",
        [DeliverableType.Carrossel] = "Carrossel",
        [DeliverableType.Tiktok] = "TikTok",
        [DeliverableType.Youtube] = "YouTube",
        [DeliverableType.Outro] = "Outro",
    };

    enum Kind { Roteiro, Aprovacao, Postagem, Pagamento }

    // Eventos não concluídos que estão atrasados ou dentro da janela de aviso.
    public static List<Reminder> Build(IEnumerable<Campaign> campaigns, DateOnly today, ReminderSettings settings)
    {
        var list = new List<Reminder>();
        foreach (var c in campaigns.Where(c => c.IsClosed))
        {
            foreach (var d in c.Deliverables.OrderBy(d => d.Position))
            {
                var what = $"{d.Quantity} {TypeLabel[d.Type]}";
                Add(Kind.Roteiro, d.ScriptDue, d.ScriptSent, settings.NotifyScript, what);
                Add(Kind.Aprovacao, d.ApprovalDue, d.Approved, settings.NotifyApproval, what);
                Add(Kind.Postagem, d.PostDate, d.Posted, settings.NotifyPost, what);
            }
            // Cobrança só enquanto há dinheiro a receber (fechada e ainda não paga).
            Add(Kind.Pagamento, c.PaymentDueDate, c.Status == CampaignStatus.Paga, settings.NotifyPayment, "");

            void Add(Kind kind, DateOnly? date, bool done, bool enabled, string what)
            {
                if (date is not { } day || done || !enabled) return;
                var diff = day.DayNumber - today.DayNumber;
                if (diff > settings.DaysBefore) return;
                var severity = diff < 0 ? ReminderSeverity.Atrasado : diff == 0 ? ReminderSeverity.Hoje : ReminderSeverity.Proximo;
                list.Add(new Reminder(severity, day, Text(kind, c.Brand, what, diff), c.Id));
            }
        }
        return list.OrderBy(r => r.Severity).ThenBy(r => r.Date).ToList();
    }

    static string Text(Kind kind, string brand, string what, int diff)
    {
        var when = diff switch { 0 => "hoje", 1 => "amanhã", _ => $"em {diff} dias" };
        var late = $"há {-diff} {(diff == -1 ? "dia" : "dias")}";
        return kind switch
        {
            Kind.Roteiro => diff < 0 ? $"Roteiro de {brand} ({what}) atrasado {late}" : $"Roteiro de {brand} ({what}) vence {when}",
            Kind.Aprovacao => diff < 0 ? $"Aprovação de {brand} ({what}) pendente {late}" : $"Aprovação de {brand} ({what}) prevista para {when}",
            Kind.Postagem => diff < 0 ? $"Post de {brand} ({what}) atrasado {late}" : $"Post de {brand} ({what}) agendado {when}",
            _ => diff < 0 ? $"Pagamento de {brand} atrasado {late}" : $"Pagamento de {brand} vence {when}",
        };
    }
}
