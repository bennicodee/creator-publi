using System.Threading.Channels;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace CreatorPubli.Api.Email;

public record EmailMessage(string To, string Subject, string Html, string Text);

public class EmailOptions
{
    // Servidor SMTP (Mailpit em desenvolvimento; Brevo, Resend, Gmail etc. em produção). Vazio = não envia.
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public SecureSocketOptions Security { get; set; } = SecureSocketOptions.Auto;
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
    public string From { get; set; } = "nao-responda@creatorpubli.com";
    public string FromName { get; set; } = "CreatorPubli";
}

public class FrontendOptions
{
    // Endereço do app, usado nos links dos e-mails.
    public string BaseUrl { get; set; } = "http://localhost:5173";
}

// Fila em memória: a requisição só enfileira e responde na hora (o tempo de resposta não
// denuncia se o e-mail existe), e o envio acontece em segundo plano.
public class EmailQueue
{
    readonly Channel<EmailMessage> channel = Channel.CreateUnbounded<EmailMessage>();

    public void Enqueue(EmailMessage message) => channel.Writer.TryWrite(message);

    public ChannelReader<EmailMessage> Reader => channel.Reader;
}

public class EmailSenderService(EmailQueue queue, EmailOptions options, IHostEnvironment env, ILogger<EmailSenderService> log)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var message in queue.Reader.ReadAllAsync(ct))
        {
            if (string.IsNullOrEmpty(options.Host))
            {
                // Sem SMTP configurado: em desenvolvimento mostra o conteúdo no log; em produção, nunca (tem link de senha).
                if (env.IsDevelopment())
                    log.LogWarning("E-mail não configurado. Para {To}: {Subject}\n{Text}", message.To, message.Subject, message.Text);
                else
                    log.LogError("E-mail não configurado (Email:Host). Mensagem para {To} não foi enviada.", message.To);
                continue;
            }

            try
            {
                await SendAsync(message, ct);
                log.LogInformation("E-mail \"{Subject}\" enviado.", message.Subject);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Falha ao enviar e-mail \"{Subject}\".", message.Subject);
            }
        }
    }

    async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(options.FromName, options.From));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder { HtmlBody = message.Html, TextBody = message.Text }.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(options.Host, options.Port, options.Security, ct);
        if (!string.IsNullOrEmpty(options.User))
            await smtp.AuthenticateAsync(options.User, options.Password, ct);
        await smtp.SendAsync(mime, ct);
        await smtp.DisconnectAsync(true, ct);
    }
}
