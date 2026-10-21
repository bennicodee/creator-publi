import { Campaign, DELIVERABLE_TYPES, Deliverable, DeliverableStep, ReminderSettings, isClosed, isReceivable } from '../types'
import { daysBetween, monthKey } from './format'

export const deliverableLabel = (d: Deliverable) => {
  const type = DELIVERABLE_TYPES.find((t) => t.id === d.type)?.label ?? d.type
  return `${d.quantity} ${type}`
}

export type EventKind = 'roteiro' | 'aprovacao' | 'postagem' | 'pagamento'

export const EVENT_LABEL: Record<EventKind, string> = {
  roteiro: 'Roteiro',
  aprovacao: 'Aprovação',
  postagem: 'Postagem',
  pagamento: 'Pagamento',
}

export interface CalendarEvent {
  id: string
  date: string
  kind: EventKind
  campaign: Campaign
  deliverable?: Deliverable
  step?: DeliverableStep
  title: string
  done: boolean
}

/** Todas as datas relevantes das campanhas fechadas (ou em diante). */
export function buildEvents(campaigns: Campaign[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const c of campaigns) {
    if (!isClosed(c.status)) continue
    for (const d of c.deliverables) {
      const label = `${c.brand} · ${deliverableLabel(d)}`
      const steps: [EventKind, string, DeliverableStep][] = [
        ['roteiro', d.scriptDue, 'scriptSent'],
        ['aprovacao', d.approvalDue, 'approved'],
        ['postagem', d.postDate, 'posted'],
      ]
      for (const [kind, date, step] of steps) {
        if (!date) continue
        events.push({ id: `${d.id}-${kind}`, date, kind, campaign: c, deliverable: d, step, title: label, done: d[step] })
      }
    }
    if (c.paymentDueDate) {
      events.push({
        id: `${c.id}-pagamento`,
        date: c.paymentDueDate,
        kind: 'pagamento',
        campaign: c,
        title: c.brand,
        done: c.status === 'paga',
      })
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

export type Severity = 'atrasado' | 'hoje' | 'proximo'

export interface Reminder {
  id: string
  severity: Severity
  kind: EventKind
  text: string
  date: string
  event: CalendarEvent
}

const KIND_SETTING: Record<EventKind, keyof ReminderSettings> = {
  roteiro: 'notifyScript',
  aprovacao: 'notifyApproval',
  postagem: 'notifyPost',
  pagamento: 'notifyPayment',
}

function reminderText(e: CalendarEvent, diff: number) {
  const brand = e.campaign.brand
  const what = e.deliverable ? deliverableLabel(e.deliverable) : ''
  const when = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : `em ${diff} dias`
  const late = `há ${-diff} ${-diff === 1 ? 'dia' : 'dias'}`
  switch (e.kind) {
    case 'roteiro':
      return diff < 0 ? `Roteiro de ${brand} (${what}) atrasado ${late}` : `Roteiro de ${brand} (${what}) vence ${when}`
    case 'aprovacao':
      return diff < 0
        ? `Aprovação de ${brand} (${what}) pendente ${late}`
        : `Aprovação de ${brand} (${what}) prevista para ${when}`
    case 'postagem':
      return diff < 0 ? `Post de ${brand} (${what}) atrasado ${late}` : `Post de ${brand} (${what}) agendado ${when}`
    case 'pagamento':
      return diff < 0 ? `Pagamento de ${brand} atrasado ${late}` : `Pagamento de ${brand} vence ${when}`
  }
}

/** Eventos não concluídos que estão atrasados ou dentro da janela de aviso. */
export function buildReminders(campaigns: Campaign[], today: string, settings: ReminderSettings): Reminder[] {
  const order: Record<Severity, number> = { atrasado: 0, hoje: 1, proximo: 2 }
  return buildEvents(campaigns)
    .filter((e) => !e.done && settings[KIND_SETTING[e.kind]])
    .filter((e) => e.kind !== 'pagamento' || isReceivable(e.campaign.status))
    .map((e) => ({ e, diff: daysBetween(today, e.date) }))
    .filter(({ diff }) => diff <= settings.daysBefore)
    .map(({ e, diff }) => ({
      id: e.id,
      severity: (diff < 0 ? 'atrasado' : diff === 0 ? 'hoje' : 'proximo') as Severity,
      kind: e.kind,
      text: reminderText(e, diff),
      date: e.date,
      event: e,
    }))
    .sort((a, b) => order[a.severity] - order[b.severity] || a.date.localeCompare(b.date))
}

/** Texto do resumo diário, usado no e-mail e no WhatsApp. */
export function digestText(reminders: Reminder[]) {
  if (reminders.length === 0) return 'Bom dia! Nada pendente hoje no CreatorPubli. ✨'
  const icon: Record<Severity, string> = { atrasado: '🔴', hoje: '🟡', proximo: '⚪' }
  return ['Bom dia! Seu resumo do CreatorPubli:', '', ...reminders.map((r) => `${icon[r.severity]} ${r.text}`)].join('\n')
}

export interface MonthSummary {
  closed: number
  received: number
  pending: number
  overdue: number
  negotiating: number
}

export function summarize(campaigns: Campaign[], month: string, today: string): MonthSummary {
  let closed = 0, received = 0, pending = 0, overdue = 0, negotiating = 0
  for (const c of campaigns) {
    if (isClosed(c.status) && c.closedAt && monthKey(c.closedAt) === month) closed += c.value
    if (c.status === 'paga' && c.paidAt && monthKey(c.paidAt) === month) received += c.value
    if (isReceivable(c.status)) {
      pending += c.value
      if (c.paymentDueDate && c.paymentDueDate < today) overdue += c.value
    }
    if (c.status === 'proposta' || c.status === 'negociando') negotiating += c.value
  }
  return { closed, received, pending, overdue, negotiating }
}
