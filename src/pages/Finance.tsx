import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Campaign, PAYMENT_METHODS, isClosed, isReceivable } from '../types'
import { brl, daysBetween, fmtDate, fmtMonth, monthKey, shiftMonth, todayISO } from '../lib/format'
import { summarize } from '../lib/schedule'
import { Card, Empty, Icon, Kpi, PageHead, StatusBadge } from '../components/ui'

const methodLabel = (c: Campaign) => PAYMENT_METHODS.find((p) => p.id === c.paymentMethod)?.label ?? ''

/** Mensagem educada de cobrança, pronta para colar no WhatsApp ou e-mail. */
function chargeMessage(c: Campaign, today: string) {
  const late = c.paymentDueDate ? daysBetween(c.paymentDueDate, today) : 0
  const who = c.contactName ? `Oi, ${c.contactName.split(' ')[0]}!` : 'Oi, tudo bem?'
  const due = c.paymentDueDate ? ` com vencimento em ${fmtDate(c.paymentDueDate)}` : ''
  const lateText = late > 0 ? ` (em aberto há ${late} dias)` : ''
  return `${who} Passando para lembrar do pagamento da campanha ${c.brand} no valor de ${brl(c.value)}${due}${lateText}. Consegue me confirmar a previsão? Obrigado(a)!`
}

export function Finance() {
  const { campaigns, setStatus } = useStore()
  const today = todayISO()
  const [month, setMonth] = useState(monthKey(today))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const s = useMemo(() => summarize(campaigns, month, today), [campaigns, month, today])

  const receivable = campaigns
    .filter((c) => isReceivable(c.status))
    .sort((a, b) => (a.paymentDueDate || '9999').localeCompare(b.paymentDueDate || '9999'))
  const receivedInMonth = campaigns.filter((c) => c.status === 'paga' && monthKey(c.paidAt) === month)
  const closedInMonth = campaigns.filter((c) => isClosed(c.status) && c.closedAt && monthKey(c.closedAt) === month)

  const byBrand = useMemo(() => {
    const map = new Map<string, { brand: string; total: number; paid: number; count: number }>()
    for (const c of campaigns.filter((c) => isClosed(c.status))) {
      const row = map.get(c.brand) ?? { brand: c.brand, total: 0, paid: 0, count: 0 }
      row.total += c.value
      row.count += 1
      if (c.status === 'paga') row.paid += c.value
      map.set(c.brand, row)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [campaigns])

  const copy = async (c: Campaign) => {
    try {
      await navigator.clipboard.writeText(chargeMessage(c, today))
      setCopiedId(c.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // clipboard bloqueado
    }
  }

  return (
    <>
      <PageHead title="Financeiro" subtitle="Quanto fechou, quanto entrou e quem ainda não te pagou." />

      <div className="toolbar">
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
            <Icon name="left" />
          </button>
          <strong>{fmtMonth(month)}</strong>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
            <Icon name="right" />
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Fechado no mês" value={brl(s.closed)} hint={`${closedInMonth.length} campanhas`} />
        <Kpi label="Recebido no mês" value={brl(s.received)} tone="good" hint={`${receivedInMonth.length} pagamentos`} />
        <Kpi label="A receber (total)" value={brl(s.pending)} hint={`${receivable.length} campanhas`} />
        <Kpi label="Atrasado" value={brl(s.overdue)} tone={s.overdue > 0 ? 'bad' : undefined} />
        <Kpi label="Em negociação" value={brl(s.negotiating)} hint="propostas abertas" />
      </div>

      <Card title="Quem ainda não te pagou">
        {receivable.length === 0 ? (
          <Empty>Tudo recebido. 💸</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Marca</th>
                  <th>Status</th>
                  <th>Vencimento</th>
                  <th className="num">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {receivable.map((c) => {
                  const diff = c.paymentDueDate ? daysBetween(today, c.paymentDueDate) : null
                  return (
                    <tr key={c.id} className={diff !== null && diff < 0 ? 'row-late' : ''}>
                      <td>
                        <a href={`#/campanhas/${c.id}`}>
                          <strong>{c.brand}</strong>
                        </a>
                        <div className="muted small">{[c.agency, methodLabel(c)].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="small">
                        {c.paymentDueDate ? fmtDate(c.paymentDueDate) : 'sem data'}
                        {diff !== null && (
                          <div className={diff < 0 ? 'text-bad' : 'muted'}>
                            {diff < 0 ? `atrasado há ${-diff} dias` : diff === 0 ? 'vence hoje' : `em ${diff} dias`}
                          </div>
                        )}
                      </td>
                      <td className="num">{brl(c.value)}</td>
                      <td className="row-actions">
                        <button className="btn small" onClick={() => copy(c)}>
                          <Icon name="copy" size={14} /> {copiedId === c.id ? 'Copiado!' : 'Cobrança'}
                        </button>
                        <button className="btn small primary" onClick={() => setStatus(c.id, 'paga')}>
                          <Icon name="check" size={14} /> Recebi
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid-2">
        <Card title={`Recebido em ${fmtMonth(month).toLowerCase()}`}>
          {receivedInMonth.length === 0 ? (
            <Empty>Nenhum pagamento neste mês.</Empty>
          ) : (
            <ul className="money-list">
              {receivedInMonth.map((c) => (
                <li key={c.id}>
                  <a href={`#/campanhas/${c.id}`}>{c.brand}</a>
                  <span className="muted small">{fmtDate(c.paidAt)}</span>
                  <strong>{brl(c.value)}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Por marca (todas as fechadas)">
          {byBrand.length === 0 ? (
            <Empty>Sem campanhas fechadas ainda.</Empty>
          ) : (
            <ul className="money-list">
              {byBrand.map((b) => (
                <li key={b.brand}>
                  <span>
                    {b.brand} <span className="muted small">· {b.count}×</span>
                  </span>
                  <span className="muted small">{brl(b.paid)} pago</span>
                  <strong>{brl(b.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
