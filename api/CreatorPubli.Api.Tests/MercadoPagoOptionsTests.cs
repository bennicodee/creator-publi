using CreatorPubli.Api.Payments;

namespace CreatorPubli.Api.Tests;

public class MercadoPagoOptionsTests
{
    [Theory]
    [InlineData("", "", false)]                               // sem Mercado Pago: assinatura simulada
    [InlineData("APP_USR-123", "", false)]                    // credenciais reais: aberto para todos
    [InlineData("APP_USR-123", "test_user@testuser.com", true)] // modo teste: "em breve"
    public void Modo_teste_so_com_token_e_comprador_de_teste(string token, string testPayer, bool testMode)
    {
        var options = new MercadoPagoOptions { AccessToken = token, TestPayerEmail = testPayer };

        Assert.Equal(testMode, options.TestMode);
    }
}
