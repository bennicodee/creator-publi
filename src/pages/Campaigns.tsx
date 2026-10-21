import { useState, type DragEvent } from 'react'
import { useStore } from '../store'
import { Campaign, CampaignStatus, STATUSES, statusIndex } from '../types'
import { brl, fmtDate, todayISO } from '../lib/format'
import { EVENT_LABEL, buildEvents, deliverableLabel } from '../lib/schedule'
import { Icon, PageHead, StatusBadge, Empty } from '../components/ui'
import { navigate } from '../router'

type View = 'kanban' | 'lista'

const VIEW_KEY = 'creatorpubli:campaignView'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'lista' ? 'lista' : 'kanban'
  } catch {
    return 'kanban'
  }
}

/** Próxima etapa pendente da campanha, para mostrar no card. */
function nextStep(c: Campaign) {
  return buildEvents([c]).find((e) => !e.done)
}

export function Campaigns() {
  const { campaigns, setStatus } = useStore()
  const [view, setViewState] = useState<View>(readView)
  const [query, setQuery] = useState('')
  const [dragOver, setDragOver] = useState<CampaignStatus | null>(null)

  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // ignora
    }
  }

  const q = query.trim().toLowerCase()
  const filtered = campaigns.filter(
    (c) => !q || [c.brand, c.agency, c.contactName, c.couponCode].some((f) => f.toLowerCase().includes(q)),
  )

  const onDrop = (e: DragEvent, status: CampaignStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) setStatus(id, status)
    setDragOver(null)
  }

  const move = (c: Campaign, dir: -1 | 1) => {
    const next = STATUSES[statusIndex(c.status) + dir]
    if (next) setStatus(c.id, next.id)
  }

  return (
    <>
      <PageHead
        title="Campanhas"
        subtitle="Arraste os cards entre colunas para atualizar o status."
        actions={
          <a className="btn primary" href="#/campanhas/nova">
            <Icon name="plus" size={16} /> Nova campanha
          </a>
        }
      />

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar marca, agência, contato, cupom…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="segmented" role="tablist">
          {(['kanban', 'lista'] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {v === 'kanban' ? 'Kanban' : 'Lista'}
            </button>
          ))}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Empty>
          Nenhuma campanha ainda. <a href="#/campanhas/nova">Cadastre a primeira publi</a>.
        </Empty>
      ) : view === 'kanban' ? (
        <div className="kanban">
          {STATUSES.map((s) => {
            const col = filtered.filter((c) => c.status === s.id)
            return (
              <div
                key={s.id}
                className={`kanban-col ${dragOver === s.id ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(s.id)
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => onDrop(e, s.id)}
              >
                <header className="kanban-head">
                  <span className={`dot-status status-${s.id}`} />
                  <strong>{s.label}</strong>
                  <span className="muted small">{col.length}</span>
                  <span className="kanban-sum muted small">{brl(col.reduce((a, c) => a + c.value, 0))}</span>
                </header>
                {col.map((c) => {
                  const step = nextStep(c)
                  const late = step && step.date < todayISO()
                  return (
                    <article
                      key={c.id}
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                      onClick={() => navigate(`/campanhas/${c.id}`)}
                    >
                      <div className="kanban-card-top">
                        <strong>{c.brand}</strong>
                        <span className="value">{brl(c.value)}</span>
                      </div>
                      {c.agency && <span className="muted small">via {c.agency}</span>}
                      {c.deliverables.length > 0 && (
                        <span className="small">{c.deliverables.map(deliverableLabel).join(' + ')}</span>
                      )}
                      {step && (
                        <span className={`small next-step ${late ? 'late' : ''}`}>
                          {late ? '⚠ ' : '→ '}
                          {EVENT_LABEL[step.kind]} {fmtDate(step.date)}
                        </span>
                      )}
                      <div className="kanban-move" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" aria-label="Voltar status" disabled={c.status === 'proposta'} onClick={() => move(c, -1)}>
                          <Icon name="left" size={14} />
                        </button>
                        <button className="icon-btn" aria-label="Avançar status" disabled={c.status === 'paga'} onClick={() => move(c, 1)}>
                          <Icon name="right" size={14} />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Agência / contato</th>
                <th>Entregáveis</th>
                <th>Status</th>
                <th className="num">Valor</th>
                <th>Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/campanhas/${c.id}`)} className="clickable">
                  <td>
                    <strong>{c.brand}</strong>
                    {c.couponCode && <div className="muted small">Cupom {c.couponCode}</div>}
                  </td>
                  <td>
                    {c.agency || '—'}
                    <div className="muted small">{c.contactName}</div>
                  </td>
                  <td className="small">{c.deliverables.map(deliverableLabel).join(' + ') || '—'}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="num">{brl(c.value)}</td>
                  <td className="small">{c.status === 'paga' ? `Pago ${fmtDate(c.paidAt)}` : fmtDate(c.paymentDueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
