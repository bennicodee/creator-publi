using System.Net;

namespace CreatorPubli.Api.Email;

public static class VerifyEmailEmail
{
    public static EmailMessage Build(string to, string callName, string link, int validHours)
    {
        var greeting = callName.Length > 0 ? $"Oii, {callName}!" : "Oii!";
        var href = WebUtility.HtmlEncode(link);

        var html = $"""
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f1b2e">
              <p style="font-size:20px;font-weight:bold;margin:0 0 16px">creator<span style="color:#7c3aed">publi</span></p>
              <p>{WebUtility.HtmlEncode(greeting)}</p>
              <p>Falta só confirmar que este e-mail é seu. É para ele que mandamos o resumo diário dos seus prazos
                e o link de "esqueci minha senha".</p>
              <p style="margin:28px 0">
                <a href="{href}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">Confirmar e-mail</a>
              </p>
              <p style="font-size:13px;color:#6b6585">O link vale por {validHours} horas. Se você não criou uma conta no CreatorPubli,
                pode ignorar este e-mail.</p>
              <p style="font-size:12px;color:#9a94b5;word-break:break-all">Se o botão não funcionar, copie e cole no navegador:<br>{href}</p>
            </div>
            """;

        var text = $"""
            {greeting}

            Falta só confirmar que este e-mail é seu. Abra o link abaixo (vale por {validHours} horas):

            {link}

            Se você não criou uma conta no CreatorPubli, pode ignorar este e-mail.
            """;

        return new EmailMessage(to, "Confirme seu e-mail no CreatorPubli", html, text);
    }
}
