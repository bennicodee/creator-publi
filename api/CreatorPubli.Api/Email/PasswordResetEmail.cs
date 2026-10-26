using System.Net;

namespace CreatorPubli.Api.Email;

public static class PasswordResetEmail
{
    public static EmailMessage Build(string to, string name, string link, int validMinutes)
    {
        var firstName = name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
        var greeting = firstName.Length > 0 ? $"Oi, {firstName}!" : "Oi!";
        var href = WebUtility.HtmlEncode(link);

        var html = $"""
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f1b2e">
              <p style="font-size:20px;font-weight:bold;margin:0 0 16px">creator<span style="color:#7c3aed">publi</span></p>
              <p>{WebUtility.HtmlEncode(greeting)}</p>
              <p>Recebemos um pedido para redefinir a senha da sua conta no CreatorPubli.</p>
              <p style="margin:28px 0">
                <a href="{href}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">Criar nova senha</a>
              </p>
              <p style="font-size:13px;color:#6b6585">O link vale por {validMinutes} minutos e só pode ser usado uma vez.
                Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.</p>
              <p style="font-size:12px;color:#9a94b5;word-break:break-all">Se o botão não funcionar, copie e cole no navegador:<br>{href}</p>
            </div>
            """;

        var text = $"""
            {greeting}

            Recebemos um pedido para redefinir a senha da sua conta no CreatorPubli.
            Para criar uma nova senha, abra o link abaixo (vale por {validMinutes} minutos e só pode ser usado uma vez):

            {link}

            Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.
            """;

        return new EmailMessage(to, "Redefinir sua senha do CreatorPubli", html, text);
    }
}
