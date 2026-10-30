using CreatorPubli.Api.Domain;
using CreatorPubli.Api.Reminders;

namespace CreatorPubli.Api.Tests;

public class ReminderBuilderTests
{
    static readonly DateOnly Today = new(2026, 10, 30);

    static Campaign Closed(string brand, params Deliverable[] deliverables) => new()
    {
        Id = Guid.NewGuid(),
        Brand = brand,
        Status = CampaignStatus.Fechada,
        Deliverables = [.. deliverables],
    };

    [Fact]
    public void Ignora_campanhas_ainda_em_negociacao()
    {
        var c = Closed("Marca", new Deliverable { PostDate = Today });
        c.Status = CampaignStatus.Negociando;

        Assert.Empty(ReminderBuilder.Build([c], Today, new ReminderSettings()));
    }

    [Fact]
    public void Classifica_atrasado_hoje_e_proximo_nessa_ordem()
    {
        var c = Closed("Marca",
            new Deliverable { Type = DeliverableType.Reels, Quantity = 1, PostDate = Today.AddDays(2) },
            new Deliverable { Type = DeliverableType.Stories, Quantity = 3, ScriptDue = Today },
            new Deliverable { Type = DeliverableType.Tiktok, Quantity = 1, ApprovalDue = Today.AddDays(-3) });

        var reminders = ReminderBuilder.Build([c], Today, new ReminderSettings { DaysBefore = 2 });

        Assert.Equal([ReminderSeverity.Atrasado, ReminderSeverity.Hoje, ReminderSeverity.Proximo], reminders.Select(r => r.Severity));
        Assert.Equal("Aprovação de Marca (1 TikTok) pendente há 3 dias", reminders[0].Text);
        Assert.Equal("Roteiro de Marca (3 Stories) vence hoje", reminders[1].Text);
        Assert.Equal("Post de Marca (1 Reels) agendado em 2 dias", reminders[2].Text);
    }

    [Fact]
    public void Respeita_a_antecedencia_e_o_que_ja_foi_feito()
    {
        var c = Closed("Marca",
            new Deliverable { PostDate = Today.AddDays(3) },
            new Deliverable { PostDate = Today, Posted = true });

        Assert.Empty(ReminderBuilder.Build([c], Today, new ReminderSettings { DaysBefore = 2 }));
    }

    [Fact]
    public void Respeita_os_tipos_de_aviso_desligados()
    {
        var c = Closed("Marca", new Deliverable { ScriptDue = Today, PostDate = Today });

        var reminders = ReminderBuilder.Build([c], Today, new ReminderSettings { NotifyScript = false });

        Assert.Single(reminders);
        Assert.StartsWith("Post de Marca", reminders[0].Text);
    }

    [Fact]
    public void Cobra_pagamento_atrasado_so_enquanto_nao_foi_pago()
    {
        var aReceber = Closed("Aberta");
        aReceber.PaymentDueDate = Today.AddDays(-1);
        var paga = Closed("Paga");
        paga.Status = CampaignStatus.Paga;
        paga.PaymentDueDate = Today.AddDays(-1);

        var reminders = ReminderBuilder.Build([aReceber, paga], Today, new ReminderSettings());

        Assert.Equal("Pagamento de Aberta atrasado há 1 dia", Assert.Single(reminders).Text);
    }
}
