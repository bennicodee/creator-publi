import { CalendarEvent } from '../lib/schedule'
import { fmtWeekday, relativeDay, todayISO } from '../lib/format'
import { useStore } from '../store'
import { KindTag } from './ui'

/** Lista de eventos agrupados por dia, com checkbox para marcar a etapa como feita. */
export function EventList({ events }: { events: CalendarEvent[] }) {
  const { toggleStep } = useStore()
  const today = todayISO()
  const days = [...new Set(events.map((e) => e.date))]

  return (
    <div className="event-days">
      {days.map((day) => (
        <div key={day} className="event-day">
          <div className="event-day-head">
            <span>{fmtWeekday(day)}</span>
            <span className="muted">{relativeDay(day, today)}</span>
          </div>
          <ul className="event-list">
            {events
              .filter((e) => e.date === day)
              .map((e) => (
                <li key={e.id} className={e.done ? 'is-done' : ''}>
                  {e.deliverable && e.step ? (
                    <input
                      type="checkbox"
                      checked={e.done}
                      onChange={() => toggleStep(e.campaign.id, e.deliverable!.id, e.step!)}
                      aria-label={`Marcar ${e.title} como feito`}
                    />
                  ) : (
                    <span className="checkbox-spacer" />
                  )}
                  <KindTag kind={e.kind} />
                  <a href={`#/campanhas/${e.campaign.id}`} className="event-title">
                    {e.title}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
