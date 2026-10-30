using System.Net;
using System.Text;
using CreatorPubli.Api.Email;

namespace CreatorPubli.Api.Reminders;

public static class ReminderDigestEmail
{
    static readonly (ReminderSeverity Severity, string Label, string Color)[] Groups =
    [
        (ReminderSeverity.Atrasado, "Atrasados", "#dc2626"),
        (ReminderSeverity.Hoje, "Hoje", "#d97706"),
        (ReminderSeverity.Proximo, "Próximos dias", "#6b6585"),
    ];

    public static EmailMessage Build(string to, string callName, IReadOnlyList<Reminder> reminders, string appUrl)
    {
        var greeting = callName.Length > 0 ? $"Oii, {callName}!" : "Oii!";
        var urgent = reminders.Count(r => r.Severity != ReminderSeverity.Proximo);
        var subject = urgent > 0
            ? $"{urgent} {(urgent == 1 ? "coisa" : "coisas")} pra hoje no CreatorPubli"
            : "Seus próximos prazos no CreatorPubli";
        var app = appUrl.TrimEnd('/');
        string Link(Reminder r) => $"{app}/#/campanhas/{r.CampaignId}";

        var html = new StringBuilder($"""
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f1b2e">
              <p style="font-size:20px;font-weight:bold;margin:0 0 16px">creator<span style="color:#7c3aed">publi</span></p>
              <p>{WebUtility.HtmlEncode(greeting)} Este é o seu resumo de hoje:</p>
            """);
        var text = new StringBuilder($"{greeting} Este é o seu resumo de hoje:\n");

        foreach (var (severity, label, color) in Groups)
        {
            var group = reminders.Where(r => r.Severity == severity).ToList();
            if (group.Count == 0) continue;
            html.Append($"""<p style="margin:20px 0 6px;font-weight:bold;color:{color}">{label} ({group.Count})</p><ul style="margin:0;padding-left:20px">""");
            text.Append($"\n{label} ({group.Count}):\n");
            foreach (var r in group)
            {
                html.Append($"""<li style="margin:4px 0"><a href="{WebUtility.HtmlEncode(Link(r))}" style="color:#1f1b2e">{WebUtility.HtmlEncode(r.Text)}</a></li>""");
                text.Append($"- {r.Text}\n");
            }
            html.Append("</ul>");
        }

        html.Append($"""
              <p style="margin:28px 0">
                <a href="{WebUtility.HtmlEncode(app)}/#/lembretes" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">Abrir o CreatorPubli</a>
              </p>
              <p style="font-size:12px;color:#9a94b5">Você recebe este e-mail porque ligou o resumo diário. Para mudar o horário,
                o que avisar ou desligar, vá em <a href="{WebUtility.HtmlEncode(app)}/#/lembretes" style="color:#9a94b5">Lembretes</a>.</p>
            </div>
            """);
        text.Append($"\nAbrir o CreatorPubli: {app}/#/lembretes\nPara mudar ou desligar o resumo, vá em Lembretes no app.\n");

        return new EmailMessage(to, subject, html.ToString(), text.ToString());
    }
}
