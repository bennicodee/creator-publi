using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CreatorPubli.Api.Payments;

public class MercadoPagoOptions
{
    // Access token da aplicação (TEST-... ou APP_USR-...). Vazio = assinatura simulada, sem cobrança.
    public string AccessToken { get; set; } = "";
    // Chave secreta dos webhooks (Suas integrações > Webhooks), usada para conferir o x-signature.
    public string WebhookSecret { get; set; } = "";
    // Só para testes: o comprador precisa ser um usuário de teste do Mercado Pago, com outro e-mail.
    public string TestPayerEmail { get; set; } = "";
    // Para onde o Mercado Pago devolve a pessoa depois de pagar; vazio = <Frontend:BaseUrl>/#/plano.
    public string BackUrl { get; set; } = "";

    public bool Enabled => AccessToken.Length > 0;

    // Credenciais de teste na produção: só o comprador de teste consegue pagar, então novas assinaturas
    // ficam fechadas ("em breve") até configurar as credenciais reais sem TestPayerEmail.
    public bool TestMode => Enabled && TestPayerEmail.Length > 0;
}

// Assinatura ("preapproval") como o Mercado Pago devolve: status pending, authorized, paused ou cancelled.
public record Preapproval(string Id, string Status, string? ExternalReference, string? InitPoint);

public class MercadoPagoException(int status, string body)
    : Exception($"Mercado Pago respondeu {status}: {body}")
{
    public int Status { get; } = status;
}

public class MercadoPagoClient(HttpClient http, MercadoPagoOptions options)
{
    public Task<Preapproval> CreateSubscriptionAsync(string externalReference, string payerEmail, decimal amount, string backUrl, CancellationToken ct) =>
        SendAsync(HttpMethod.Post, "preapproval", new
        {
            reason = "Plano Creator - CreatorPubli",
            external_reference = externalReference,
            payer_email = options.TestPayerEmail.Length > 0 ? options.TestPayerEmail : payerEmail,
            auto_recurring = new { frequency = 1, frequency_type = "months", transaction_amount = amount, currency_id = "BRL" },
            back_url = backUrl,
            status = "pending",
        }, ct);

    public Task<Preapproval> GetSubscriptionAsync(string id, CancellationToken ct) =>
        SendAsync(HttpMethod.Get, $"preapproval/{Uri.EscapeDataString(id)}", null, ct);

    public Task<Preapproval> CancelSubscriptionAsync(string id, CancellationToken ct) =>
        SendAsync(HttpMethod.Put, $"preapproval/{Uri.EscapeDataString(id)}", new { status = "cancelled" }, ct);

    async Task<Preapproval> SendAsync(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.AccessToken);
        if (body is not null) request.Content = JsonContent.Create(body);

        using var response = await http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode) throw new MercadoPagoException((int)response.StatusCode, json);

        var root = JsonDocument.Parse(json).RootElement;
        string? Text(string name) => root.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
        return new Preapproval(Text("id") ?? "", Text("status") ?? "", Text("external_reference"), Text("init_point"));
    }
}

public static class MercadoPagoWebhook
{
    // Confere o cabeçalho x-signature ("ts=...,v1=...") como a documentação do Mercado Pago descreve:
    // HMAC-SHA256 (hex) do manifesto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com a chave secreta.
    public static bool IsValid(string? signature, string? requestId, string dataId, string secret)
    {
        if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(secret)) return false;

        string? ts = null, v1 = null;
        foreach (var part in signature.Split(','))
        {
            var kv = part.Split('=', 2, StringSplitOptions.TrimEntries);
            if (kv.Length != 2) continue;
            if (kv[0] == "ts") ts = kv[1];
            else if (kv[0] == "v1") v1 = kv[1];
        }
        if (ts is null || v1 is null) return false;

        var manifest = new StringBuilder();
        if (dataId.Length > 0) manifest.Append($"id:{dataId.ToLowerInvariant()};");
        if (!string.IsNullOrEmpty(requestId)) manifest.Append($"request-id:{requestId};");
        manifest.Append($"ts:{ts};");

        var expected = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(manifest.ToString())));
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(v1.ToLowerInvariant()));
    }
}
