import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { addDays, fmtMonth, monthKey, parseISO, shiftMonth, toISO, todayISO } from '../lib/format'
import { EVENT_LABEL, EventKind, buildEvents } from '../lib/schedule'
import { EventList } from '../components/EventList'
import { Card, Empty, Icon, PageHead } from '../components/ui'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const KINDS = Object.keys(EVENT_LABEL) as EventKind[]

export function CalendarPage() {
  const { campaigns } = useStore()
  const today = todayISO()
  const [month, setMonth] = useState(monthKey(today))
  const [selected, setSelected] = useState(today)
  const [kinds, setKinds] = useState<Set<EventKind>>(new Set(KINDS))

  const events = useMemo(() => buildEvents(campaigns).filter((e) => kinds.has(e.kind)), [campaigns, kinds])

  // Grade de 6 semanas começando na segunda-feira anterior ao dia 1.
  const days = useMemo(() => {
    const first = parseISO(`${month}-01`)
    const offset = (first.getDay() + 6) % 7
    const start = addDays(toISO(first), -offset)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [month])

  const toggleKind = (k: EventKind) =>
    setKinds((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const dayEvents = events.filter((e) => e.date === selected)

  return (
    <>
      <PageHead title="Calendário" subtitle="Roteiros, aprovações, postagens e pagamentos num lugar só." />

      <div className="toolbar">
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
            <Icon name="left" />
          </button>
          <strong>{fmtMonth(month)}</strong>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
            <Icon name="right" />
          </button>
          <button
            className="btn small"
            onClick={() => {
              setMonth(monthKey(today))
              setSelected(today)
            }}
          >
            Hoje
          </button>
        </div>
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k} className={`chip kind-${k} ${kinds.has(k) ? 'on' : ''}`} onClick={() => toggleKind(k)}>
              {EVENT_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">
              {w}
            </div>
          ))}
          {days.map((d) => {
            const list = events.filter((e) => e.date === d)
            const cls = [
              'cal-day',
              monthKey(d) !== month && 'outside',
              d === today && 'today',
              d === selected && 'selected',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button key={d} className={cls} onClick={() => setSelected(d)}>
                <span className="cal-num">{parseISO(d).getDate()}</span>
                <span className="cal-events">
                  {list.slice(0, 3).map((e) => (
                    <span key={e.id} className={`cal-pill kind-${e.kind} ${e.done ? 'done' : ''}`}>
                      {e.campaign.brand}
                    </span>
                  ))}
                  {list.length > 3 && <span className="cal-more">+{list.length - 3}</span>}
                </span>
                {list.length > 0 && (
                  <span className="cal-dots">
                    {list.slice(0, 4).map((e) => (
                      <span key={e.id} className={`cal-dot kind-${e.kind}`} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <Card title="Dia selecionado">
          {dayEvents.length === 0 ? <Empty>Nada marcado para este dia.</Empty> : <EventList events={dayEvents} />}
        </Card>
      </div>
    </>
  )
}
