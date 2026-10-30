import { useState } from 'react'
import { useStore } from '../store'
import { useAuth } from '../auth'
import { SignOutButton } from '../components/SignOutButton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { addDays, fmtDate, todayISO } from '../lib/format'
import { Card, Icon, IconName, PageHead } from '../components/ui'

const FREE = [
  'Campanhas com kanban de status',
  'Entregáveis, prazos e calendário',
  'Lembretes no painel e por e-mail',
  'Financeiro: fechado, recebido e atrasado',
  'Mensagem de cobrança pronta',
]

const PREMIUM: { title: string; description: string; to: string; icon: IconName }[] = [
  { title: 'Resumo no WhatsApp', description: 'Resumo do dia pronto para enviar no WhatsApp (envio automático em breve)', to: '/lembretes', icon: 'whatsapp' },
  { title: 'Métricas dos posts', description: 'Confirma a postagem pelo link e organiza views e engajamento de cada publi', to: '/metricas', icon: 'chart' },
  { title: 'Mídia kit', description: 'Página com seus números, preços e cases', to: '/midia-kit', icon: 'kit' },
  { title: 'Assistente de briefing', description: 'Lê o briefing e monta checklist e roteiro (no fim de cada campanha)', to: '/campanhas/nova', icon: 'sparkle' },
  { title: 'Notas fiscais', description: 'NF pré-preenchida a partir da campanha paga', to: '/notas', icon: 'invoice' },
]

/** Próxima cobrança mensal a partir da data de assinatura. */
function nextBilling(since: string) {
  let date = since
  const today = todayISO()
  while (date <= today) date = addDays(date, 30)
  return date
}

export function Plan() {
  const { plan, subscribe, cancelPlan, loadDemo, clearAll, campaigns, reload } = useStore()
  const { user } = useAuth()
  const [subscribing, setSubscribing] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const startSubscription = async () => {
    setSubscribing(true)
    await subscribe()
    // Se foi para o Mercado Pago, a página muda; se não (simulado ou erro), libera o botão.
    setSubscribing(false)
  }

  return (
    <>
      <PageHead title="Plano" subtitle="Feito por creator, pra creator." />

      {plan.status === 'pending' && (
        <Card className="plan-notice">
          <strong>Seu pagamento está em andamento</strong>
          <p className="muted small">
            Assim que o Mercado Pago confirmar, o Plano Creator é liberado automaticamente. Se você já pagou, pode levar alguns
            instantes.
          </p>
          <div className="row gap">
            {plan.checkoutUrl && (
              <a className="btn primary" href={plan.checkoutUrl}>
                Continuar pagamento
              </a>
            )}
            <button className="btn" onClick={reload}>
              Já paguei, atualizar
            </button>
          </div>
        </Card>
      )}

      {plan.status === 'paused' && (
        <Card className="plan-notice">
          <strong>Sua assinatura está pausada</strong>
          <p className="muted small">
            O Mercado Pago pausou a cobrança (por exemplo, por um problema no cartão). Confira sua assinatura no app ou no site do
            Mercado Pago para reativar.
          </p>
        </Card>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar o Plano Creator?"
        confirmLabel="Cancelar assinatura"
        cancelLabel="Manter plano"
        onConfirm={() => {
          setConfirmCancel(false)
          cancelPlan()
        }}
        onCancel={() => setConfirmCancel(false)}
      >
        Os recursos premium serão bloqueados
        {plan.paymentsEnabled ? ' e as próximas cobranças no Mercado Pago, canceladas.' : '.'}
      </ConfirmDialog>

      {plan.active ? (
        <Card className="plan-active">
          <div className="plan-active-head">
            <span className="plan-badge">
              <Icon name="star" size={14} /> Plano Creator ativo
            </span>
            <span className="muted small">
              Desde {fmtDate(plan.since)} · próxima cobrança {fmtDate(nextBilling(plan.since))} · R$ 11,99
            </span>
          </div>
          <div className="feature-grid">
            {PREMIUM.map((f) => (
              <a key={f.title} href={`#${f.to}`} className="feature-tile">
                <Icon name={f.icon} size={22} />
                <strong>{f.title}</strong>
                <span className="muted small">{f.description}</span>
              </a>
            ))}
          </div>
          <button className="btn ghost danger small self-start" onClick={() => setConfirmCancel(true)}>
            Cancelar assinatura
          </button>
        </Card>
      ) : (
        <div className="grid-2">
          <Card className="plan-free">
            <span className="plan-badge muted-badge">Grátis</span>
            <div className="plan-price">
              <strong>R$ 0</strong>
            </div>
            <ul className="check-list">
              {FREE.map((i) => (
                <li key={i}>
                  <Icon name="check" size={16} /> {i}
                </li>
              ))}
            </ul>
            <p className="muted small center">Seu plano atual</p>
          </Card>

          <Card className="plan-card">
            <span className="plan-badge">Plano Creator</span>
            <div className="plan-price">
              <span>R$</span>
              <strong>11,99</strong>
              <span>/mês</span>
            </div>
            <p className="muted">Tudo do grátis, mais:</p>
            <ul className="check-list">
              {PREMIUM.map((f) => (
                <li key={f.title}>
                  <Icon name={f.icon} size={16} />
                  <span>
                    <strong>{f.title}</strong> <span className="muted small">— {f.description}</span>
                  </span>
                </li>
              ))}
            </ul>
            {plan.subscriptionsOpen ? (
              <>
                <button className="btn primary block" onClick={startSubscription} disabled={subscribing || plan.status === 'pending'}>
                  {subscribing ? 'Abrindo pagamento…' : 'Assinar Plano Creator'}
                </button>
                <p className="muted small center">
                  {plan.paymentsEnabled
                    ? 'Pagamento seguro pelo Mercado Pago. Cobrança mensal no cartão; cancele quando quiser.'
                    : 'Versão de demonstração: a assinatura é simulada, sem cobrança.'}
                </p>
              </>
            ) : (
              <>
                <button className="btn primary block" disabled>
                  Em breve
                </button>
                <p className="muted small center">
                  As assinaturas abrem nos próximos dias. Enquanto isso, aproveite tudo do plano grátis.
                </p>
              </>
            )}
          </Card>
        </div>
      )}

      {user && (
        <Card title="Sua conta">
          <p className="muted small">
            {user.name} · {user.email} · {user.hasPassword && user.googleLinked ? 'login com e-mail e senha ou Google' : user.hasPassword ? 'login com e-mail e senha' : 'login com Google'}
          </p>
          <div className="row gap">
            <a className="btn" href="#/conta">
              <Icon name="kit" size={16} /> Minha conta
            </a>
            <SignOutButton className="btn ghost">
              <Icon name="logout" size={16} /> Sair
            </SignOutButton>
          </div>
        </Card>
      )}

      <Card title="Seus dados">
        <p className="muted small">Tudo fica salvo na sua conta e aparece em qualquer aparelho em que você entrar ({campaigns.length} campanhas).</p>
        <div className="row gap">
          <button className="btn" onClick={() => confirm('Substituir suas campanhas e perfil pelos dados de exemplo?') && loadDemo()}>
            Carregar exemplo
          </button>
          <button className="btn ghost danger" onClick={() => confirm('Apagar todas as campanhas?') && clearAll()}>
            <Icon name="trash" size={16} /> Começar do zero
          </button>
        </div>
      </Card>
    </>
  )
}
