import { useMemo } from 'react'
import { useStore } from '../store'
import { displayName, useAuth } from '../auth'
import { STATUSES } from '../types'
import { addDays, brl, fmtDate, fmtMonth, monthKey, todayISO } from '../lib/format'
import { buildEvents, buildReminders, summarize } from '../lib/schedule'
import { EventList } from '../components/EventList'
import { Card, Empty, Icon, Kpi, PageHead, SeverityDot } from '../components/ui'

export function Dashboard() {
  const { campaigns, settings } = useStore()
  const { user } = useAuth()
  const today = todayISO()
  const month = monthKey(today)

  const summary = useMemo(() => summarize(campaigns, month, today), [campaigns, month, today])
  const reminders = useMemo(() => buildReminders(campaigns, today, settings), [campaigns, today, settings])
  const week = useMemo(() => {
    const end = addDays(today, 6)
    return buildEvents(campaigns).filter((e) => e.date >= today && e.date <= end)
  }, [campaigns, today])

  const pipeline = STATUSES.map((s) => {
    const list = campaigns.filter((c) => c.status === s.id)
    return { ...s, count: list.length, total: list.reduce((a, c) => a + c.value, 0) }
  })
  const maxCount = Math.max(1, ...pipeline.map((p) => p.count))

  return (
    <>
      <PageHead
        title={`Oii, ${displayName(user!)}!`}
        subtitle={`${fmtMonth(month)} · ${campaigns.length} campanhas no painel`}
        actions={
          <a className="btn primary" href="#/campanhas/nova">
            <Icon name="plus" size={16} /> Nova campanha
          </a>
        }
      />

      <div className="kpis">
        <Kpi label="Fechado no mês" value={brl(summary.closed)} />
        <Kpi label="Recebido no mês" value={brl(summary.received)} tone="good" />
        <Kpi label="A receber" value={brl(summary.pending)} hint="todas as campanhas fechadas" />
        <Kpi
          label="Pagamento atrasado"
          value={brl(summary.overdue)}
          tone={summary.overdue > 0 ? 'bad' : undefined}
          hint={summary.overdue > 0 ? 'cobre essas marcas' : 'ninguém te devendo 🎉'}
        />
      </div>

      <div className="grid-2">
        <Card title="Precisa da sua atenção" action={<a href="#/lembretes" className="link">Ver todos</a>}>
          {reminders.length === 0 ? (
            <Empty>Nada urgente. Aproveita pra criar conteúdo 🙂</Empty>
          ) : (
            <ul className="reminder-list">
              {reminders.slice(0, 7).map((r) => (
                <li key={r.id}>
                  <SeverityDot severity={r.severity} />
                  <a href={`#/campanhas/${r.event.campaign.id}`}>{r.text}</a>
                  <span className="muted small">{fmtDate(r.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Próximos 7 dias" action={<a href="#/calendario" className="link">Calendário</a>}>
          {week.length === 0 ? <Empty>Nenhuma entrega nos próximos 7 dias.</Empty> : <EventList events={week} />}
        </Card>
      </div>

      <Card title="Funil de campanhas" action={<a href="#/campanhas" className="link">Abrir kanban</a>}>
        <div className="pipeline">
          {pipeline.map((p) => (
            <div key={p.id} className="pipeline-row">
              <span className="pipeline-label">{p.label}</span>
              <div className="pipeline-bar">
                <span className={`pipeline-fill status-${p.id}`} style={{ width: `${(p.count / maxCount) * 100}%` }} />
              </div>
              <span className="pipeline-count">{p.count}</span>
              <span className="pipeline-total muted">{brl(p.total)}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
