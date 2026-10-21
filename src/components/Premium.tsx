import type { ReactNode } from 'react'
import { useStore } from '../store'
import { Icon } from './ui'

export function PremiumBadge() {
  return (
    <span className="premium-badge" title="Plano Creator">
      <Icon name="star" size={11} /> Creator
    </span>
  )
}

export function Paywall({ feature, description, compact }: { feature: string; description?: string; compact?: boolean }) {
  if (compact) {
    return (
      <a href="#/plano" className="paywall-inline">
        <Icon name="lock" size={14} /> {feature} — disponível no Plano Creator
      </a>
    )
  }
  return (
    <div className="paywall">
      <span className="paywall-icon">
        <Icon name="lock" size={22} />
      </span>
      <strong>{feature}</strong>
      {description && <p className="muted">{description}</p>}
      <a href="#/plano" className="btn primary">
        <Icon name="star" size={16} /> Liberar com o Plano Creator · R$ 11,99/mês
      </a>
    </div>
  )
}

/** Renderiza o conteúdo só para assinantes; os demais veem o paywall. */
export function Premium({
  feature,
  description,
  compact,
  children,
}: {
  feature: string
  description?: string
  compact?: boolean
  children: ReactNode
}) {
  const { plan } = useStore()
  if (plan.active) return <>{children}</>
  return <Paywall feature={feature} description={description} compact={compact} />
}
