export type CampaignStatus =
  | 'proposta'
  | 'negociando'
  | 'fechada'
  | 'producao'
  | 'aprovacao'
  | 'postada'
  | 'paga'

export const STATUSES: { id: CampaignStatus; label: string }[] = [
  { id: 'proposta', label: 'Proposta' },
  { id: 'negociando', label: 'Negociando' },
  { id: 'fechada', label: 'Fechada' },
  { id: 'producao', label: 'Em produção' },
  { id: 'aprovacao', label: 'Aprovação' },
  { id: 'postada', label: 'Postada' },
  { id: 'paga', label: 'Paga' },
]

export const statusLabel = (s: CampaignStatus) => STATUSES.find((x) => x.id === s)!.label
export const statusIndex = (s: CampaignStatus) => STATUSES.findIndex((x) => x.id === s)
/** Fechada em diante = dinheiro comprometido. */
export const isClosed = (s: CampaignStatus) => statusIndex(s) >= statusIndex('fechada')
/** Fechada mas ainda não paga = a receber. */
export const isReceivable = (s: CampaignStatus) => isClosed(s) && s !== 'paga'

export type PaymentMethod = 'pix' | 'transferencia' | 'boleto' | 'cartao' | 'permuta' | 'outro'

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'transferencia', label: 'Transferência' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'cartao', label: 'Cartão' },
  { id: 'permuta', label: 'Permuta' },
  { id: 'outro', label: 'Outro' },
]

export type DeliverableType = 'reels' | 'stories' | 'feed' | 'carrossel' | 'tiktok' | 'youtube' | 'outro'

export const DELIVERABLE_TYPES: { id: DeliverableType; label: string }[] = [
  { id: 'reels', label: 'Reels' },
  { id: 'stories', label: 'Stories' },
  { id: 'feed', label: 'Post feed' },
  { id: 'carrossel', label: 'Carrossel' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'outro', label: 'Outro' },
]

export interface Deliverable {
  id: string
  type: DeliverableType
  quantity: number
  description: string
  /** Datas no formato YYYY-MM-DD; string vazia = sem data. */
  scriptDue: string
  approvalDue: string
  postDate: string
  scriptSent: boolean
  approved: boolean
  posted: boolean
}

export type DeliverableStep = 'scriptSent' | 'approved' | 'posted'

export interface Campaign {
  id: string
  brand: string
  agency: string
  contactName: string
  contactEmail: string
  contactPhone: string
  value: number
  paymentMethod: PaymentMethod
  paymentDueDate: string
  paidAt: string
  closedAt: string
  status: CampaignStatus
  briefing: string
  briefingLink: string
  couponCode: string
  couponDiscount: string
  couponLink: string
  notes: string
  deliverables: Deliverable[]
  createdAt: string
}

export interface ReminderSettings {
  email: string
  whatsapp: string
  notifyScript: boolean
  notifyApproval: boolean
  notifyPost: boolean
  notifyPayment: boolean
  /** Quantos dias antes do prazo começar a avisar. */
  daysBefore: number
  digestTime: string
}
