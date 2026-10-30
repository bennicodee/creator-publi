using System.Security.Cryptography;
using System.Text;
using CreatorPubli.Api.Payments;

namespace CreatorPubli.Api.Tests;

public class MercadoPagoWebhookTests
{
    const string Secret = "segredo-de-teste";

    static string Sign(string manifest) =>
        Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(Secret), Encoding.UTF8.GetBytes(manifest)));

    [Fact]
    public void Aceita_assinatura_correta()
    {
        var v1 = Sign("id:abc123;request-id:req-1;ts:1700000000;");

        Assert.True(MercadoPagoWebhook.IsValid($"ts=1700000000,v1={v1}", "req-1", "ABC123", Secret));
    }

    [Fact]
    public void Recusa_assinatura_de_outro_evento()
    {
        var v1 = Sign("id:outro;request-id:req-1;ts:1700000000;");

        Assert.False(MercadoPagoWebhook.IsValid($"ts=1700000000,v1={v1}", "req-1", "abc123", Secret));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("ts=1700000000")]
    [InlineData("v1=abc")]
    public void Recusa_cabecalho_ausente_ou_incompleto(string? signature)
    {
        Assert.False(MercadoPagoWebhook.IsValid(signature, "req-1", "abc123", Secret));
    }

    [Fact]
    public void Recusa_quando_a_chave_secreta_nao_esta_configurada()
    {
        var v1 = Sign("id:abc123;request-id:req-1;ts:1700000000;");

        Assert.False(MercadoPagoWebhook.IsValid($"ts=1700000000,v1={v1}", "req-1", "abc123", ""));
    }
}
