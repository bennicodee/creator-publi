import { Campaign } from '../types'
import { deliverableLabel } from './schedule'
import { fmtDate } from './format'

export interface BriefingAnalysis {
  hashtags: string[]
  mentions: string[]
  links: string[]
  musts: string[]
  donts: string[]
  checklist: string[]
  script: string
}

const MUST = /\b(obrigat[óo]ri|mostrar|mostre|citar|cite|mencionar|mencione|deve|precisa|incluir|inclua|usar|use|destacar|falar)/i
const DONT = /\b(n[ãa]o|evitar|evite|proibido|nunca|sem)\b/i

const unique = (xs: string[]) => [...new Set(xs)]
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function sentences(text: string) {
  return text
    .split(/[\n.;!?]+/)
    .map((s) => s.replace(/^[\s\-•*]+/, '').trim())
    .filter((s) => s.length > 3)
}

/**
 * Assistente de briefing: lê o texto e monta checklist e roteiro.
 * Roda localmente com regras; a assinatura é a mesma que uma chamada
 * a um modelo de IA no backend teria, para trocar depois sem mexer na UI.
 */
export function analyzeBriefing(c: Campaign): BriefingAnalysis {
  const text = c.briefing
  const hashtags = unique(text.match(/#[\p{L}\d_]+/gu) ?? [])
  const mentions = unique(text.match(/@[\w.]*\w/g) ?? [])
  const links = unique(text.match(/https?:\/\/\S+/g) ?? [])
  const all = sentences(text)
  const donts = all.filter((s) => DONT.test(s))
  const musts = all.filter((s) => !DONT.test(s) && MUST.test(s))

  const checklist: string[] = []
  for (const d of c.deliverables) {
    const label = deliverableLabel(d)
    if (d.scriptDue) checklist.push(`Enviar roteiro de ${label} até ${fmtDate(d.scriptDue)}`)
    checklist.push(`Gravar e editar ${label}`)
    if (d.approvalDue) checklist.push(`Conseguir aprovação de ${label} até ${fmtDate(d.approvalDue)}`)
    if (d.postDate) checklist.push(`Postar ${label} em ${fmtDate(d.postDate)}`)
  }
  musts.forEach((s) => checklist.push(`Garantir: ${s}`))
  donts.forEach((s) => checklist.push(`Atenção: ${s}`))
  if (hashtags.length) checklist.push(`Usar ${hashtags.join(' ')}`)
  if (mentions.length) checklist.push(`Marcar ${mentions.join(' ')}`)
  if (c.couponCode) checklist.push(`Divulgar cupom ${c.couponCode}${c.couponDiscount ? ` (${c.couponDiscount})` : ''}`)
  if (c.couponLink) checklist.push('Colocar link rastreável na bio / sticker de link')
  checklist.push('Sinalizar como publicidade (#publi / parceria paga)')
  checklist.push('Enviar prints e métricas para a marca 7 dias após postar')

  return { hashtags, mentions, links, musts, donts, checklist, script: buildScript(c, musts, hashtags, mentions) }
}

function buildScript(c: Campaign, musts: string[], hashtags: string[], mentions: string[]) {
  const brand = c.brand || 'a marca'
  const key = musts[0] && lowerFirst(musts[0])
  const cta = c.couponCode
    ? `Usa meu cupom ${c.couponCode}${c.couponDiscount ? ` pra ganhar ${c.couponDiscount}` : ''} — link na bio!`
    : `Corre no perfil da ${brand}, o link tá na bio!`
  const video = c.deliverables.find((d) => ['reels', 'tiktok', 'youtube'].includes(d.type))
  const stories = c.deliverables.find((d) => d.type === 'stories')

  const parts: string[] = []
  if (video || !stories) {
    parts.push(
      `🎬 ${video ? deliverableLabel(video).toUpperCase() : 'VÍDEO'}`,
      '',
      `GANCHO (0–3s): "Eu não acreditava até testar isso aqui…" (mostrar o produto da ${brand} na mão)`,
      '',
      `CONTEXTO (3–10s): conta a dor do dia a dia que o produto resolve${key ? ` — ${key}` : ''}.`,
      '',
      `PRODUTO EM USO (10–25s): mostrar usando de verdade, textura/detalhe em close.${musts[1] ? ` Lembrar: ${lowerFirst(musts[1])}.` : ''}`,
      '',
      'RESULTADO (25–35s): antes/depois ou sua opinião sincera em uma frase.',
      '',
      `CTA (final): "${cta}"`,
      '',
    )
  }
  if (stories) {
    parts.push(`📱 ${deliverableLabel(stories).toUpperCase()}`, '')
    // O CTA com cupom fecha a sequência, seja qual for a quantidade de stories.
    const middle = [
      `enquete "Você já conhecia a ${brand}?"`,
      'produto chegando / unboxing rápido',
      'usando + sticker de link',
      'caixinha de perguntas sobre o produto',
    ]
    const frames = [...middle.slice(0, Math.max(stories.quantity - 1, 0)), cta]
    parts.push(...frames.map((f, i) => `Story ${i + 1}: ${f}`), '')
  }
  const caption = [`Legenda: parceria com ${mentions[0] ?? brand}.`, cta, [...hashtags, '#publi'].join(' ')]
  parts.push('✍️ LEGENDA', ...caption)
  return parts.join('\n')
}
