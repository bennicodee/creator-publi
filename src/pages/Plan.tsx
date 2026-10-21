import { useStore } from '../store'
import { Card, Icon, PageHead } from '../components/ui'

const INCLUDED = [
  'Campanhas ilimitadas com kanban de status',
  'Entregáveis com prazos de roteiro, aprovação e postagem',
  'Calendário com tudo que vence na semana',
  'Lembretes diários por e-mail',
  'Financeiro: fechado, recebido, pendente e atrasado',
  'Mensagem de cobrança pronta pra mandar',
]

const ROADMAP = [
  ['Lembretes por WhatsApp', 'Aviso direto no seu celular'],
  ['Integração Instagram/TikTok', 'Confirma postagem e puxa métricas'],
  ['Mídia kit', 'Página pública com seus números e cases'],
  ['Assistente com IA', 'Lê o briefing e monta checklist e roteiro'],
  ['Emissão de nota fiscal', 'NF direto da campanha paga'],
]

export function Plan() {
  const { loadDemo, clearAll, campaigns } = useStore()

  return (
    <>
      <PageHead title="Plano" subtitle="Feito por creator, pra creator." />

      <div className="grid-2">
        <Card className="plan-card">
          <span className="plan-badge">Plano Creator</span>
          <div className="plan-price">
            <span>R$</span>
            <strong>11,99</strong>
            <span>/mês</span>
          </div>
          <p className="muted">Menos que um café por semana para nunca mais esquecer um prazo ou uma cobrança.</p>
          <ul className="check-list">
            {INCLUDED.map((i) => (
              <li key={i}>
                <Icon name="check" size={16} /> {i}
              </li>
            ))}
          </ul>
          <button className="btn primary block" onClick={() => alert('Checkout entra quando o backend estiver pronto 🙂')}>
            Assinar agora
          </button>
          <p className="muted small center">7 dias grátis · cancele quando quiser</p>
        </Card>

        <div className="stack">
          <Card title="Vem aí">
            <ul className="roadmap">
              {ROADMAP.map(([t, d]) => (
                <li key={t}>
                  <strong>{t}</strong>
                  <span className="muted small">{d}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Seus dados">
            <p className="muted small">
              Nesta versão, tudo fica salvo apenas neste navegador ({campaigns.length} campanhas).
            </p>
            <div className="row gap">
              <button className="btn" onClick={() => confirm('Substituir suas campanhas pelos dados de exemplo?') && loadDemo()}>
                Carregar exemplo
              </button>
              <button className="btn ghost danger" onClick={() => confirm('Apagar todas as campanhas?') && clearAll()}>
                <Icon name="trash" size={16} /> Começar do zero
              </button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
