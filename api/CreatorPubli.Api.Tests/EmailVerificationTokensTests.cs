using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Domain;

namespace CreatorPubli.Api.Tests;

public class EmailVerificationTokensTests
{
    static readonly EmailVerificationTokens Tokens = new(new JwtOptions { Key = new string('k', 32) });
    static readonly DateTimeOffset Now = new(2026, 10, 30, 12, 0, 0, TimeSpan.Zero);
    static readonly User User = new() { Id = Guid.NewGuid(), Email = "creator@exemplo.com" };

    [Fact]
    public void Link_valido_devolve_usuario_e_email()
    {
        var read = Tokens.Read(Tokens.Create(User, Now), Now.AddHours(1));

        Assert.Equal((User.Id, User.Email), read);
    }

    [Fact]
    public void Link_expirado_e_recusado()
    {
        var token = Tokens.Create(User, Now);

        Assert.Null(Tokens.Read(token, Now.AddHours(EmailVerificationTokens.ValidHours + 1)));
    }

    [Fact]
    public void Link_alterado_e_recusado()
    {
        var token = Tokens.Create(User, Now);
        var other = Tokens.Create(new User { Id = Guid.NewGuid(), Email = "outra@exemplo.com" }, Now);
        // Dados de um link com a assinatura de outro.
        var forged = token.Split('.')[0] + "." + other.Split('.')[1];

        Assert.Null(Tokens.Read(forged, Now));
        Assert.Null(Tokens.Read("lixo", Now));
        Assert.Null(Tokens.Read("a.b.c", Now));
    }

    [Fact]
    public void Link_assinado_com_outra_chave_e_recusado()
    {
        var otherKey = new EmailVerificationTokens(new JwtOptions { Key = new string('x', 32) });

        Assert.Null(Tokens.Read(otherKey.Create(User, Now), Now));
    }
}
