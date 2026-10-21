import { Campaign, PostMetrics } from '../types'

export const interactions = (m: PostMetrics) => m.likes + m.comments + m.shares + m.saves

export const engagementRate = (m: PostMetrics) => (m.views > 0 ? (interactions(m) / m.views) * 100 : 0)

export const sumMetrics = (list: PostMetrics[]): PostMetrics =>
  list.reduce(
    (a, m) => ({
      views: a.views + m.views,
      likes: a.likes + m.likes,
      comments: a.comments + m.comments,
      shares: a.shares + m.shares,
      saves: a.saves + m.saves,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
  )

export interface CampaignResult {
  campaign: Campaign
  metrics: PostMetrics
  posts: number
  engagement: number
  /** Custo para a marca por mil visualizações. */
  cpm: number
}

/** Resultado consolidado de cada campanha que tem métricas preenchidas. */
export function campaignResults(campaigns: Campaign[]): CampaignResult[] {
  return campaigns
    .map((c) => {
      const list = c.deliverables.flatMap((d) => (d.metrics ? [d.metrics] : []))
      const metrics = sumMetrics(list)
      return {
        campaign: c,
        metrics,
        posts: list.length,
        engagement: engagementRate(metrics),
        cpm: metrics.views > 0 ? (c.value / metrics.views) * 1000 : 0,
      }
    })
    .filter((r) => r.posts > 0)
    .sort((a, b) => b.metrics.views - a.metrics.views)
}

const compactFmt = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
export const compact = (n: number) => compactFmt.format(n || 0)
export const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
