import type { ReactNode } from 'react'
import { CampaignStatus, statusLabel } from '../types'
import { EVENT_LABEL, EventKind, Severity } from '../lib/schedule'

const ICONS = {
  home: 'M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5',
  campaigns: 'M4 5h16v4H4zM4 13h10v6H4zM17 13h3v6h-3z',
  calendar: 'M4 6h16v15H4zM4 10h16M9 3v5M15 3v5',
  money: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 12h.01M18 12h.01',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M5 12l5 5 9-10',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  whatsapp: 'M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  kit: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  invoice: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  print: 'M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return <span className={`badge status-${status}`}>{statusLabel(status)}</span>
}

export function KindTag({ kind }: { kind: EventKind }) {
  return <span className={`tag kind-${kind}`}>{EVENT_LABEL[kind]}</span>
}

export function SeverityDot({ severity }: { severity: Severity }) {
  return <span className={`dot sev-${severity}`} aria-hidden="true" />
}

export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className={`kpi ${tone ? `tone-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  )
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
