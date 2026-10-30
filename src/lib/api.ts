import { emptyProfile } from './seed'
import type { Campaign, CampaignStatus, Deliverable, DeliverableStep, Plan, PostMetrics, Profile, ReminderSettings } from '../types'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5080').replace(/\/$/, '')

export interface User {
  id: string
  name: string
  /** Como a pessoa quer ser chamada; vazio = primeiro nome (ver displayName em auth.tsx). */
  nickname: string
  email: string
  /** false até a pessoa abrir o link do e-mail de confirmação (Google já vem confirmado). */
  emailVerified: boolean
  provider: 'senha' | 'google'
  picture: string | null
  hasPassword: boolean
  googleLinked: boolean
}

export interface AuthResponse {
  token: string
  expiresAt: string
  user: User
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

let token = ''
let onUnauthorized = () => {}

export const setToken = (t: string) => {
  token = t
}

/** Chamado quando a API recusa o token (expirado ou inválido). */
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

/** Lê a mensagem de um ProblemDetails do ASP.NET (detail, ou o primeiro erro de validação). */
async function problemMessage(res: Response) {
  try {
    const p = await res.json()
    const firstError = p.errors && (Object.values(p.errors) as string[][])[0]?.[0]
    return p.detail || firstError || p.title
  } catch {
    return ''
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Sem conexão com o servidor. Tente de novo em instantes.', 0)
  }
  if (res.status === 401 && token) onUnauthorized()
  if (!res.ok) throw new ApiError((await problemMessage(res)) || 'Algo deu errado. Tente de novo.', res.status)
  return (res.status === 204 ? undefined : await res.json()) as T
}

// ---------- conversões ----------
// O frontend usa "" para "sem data/valor"; a API usa null.

type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null }

type ApiDeliverable = Nullable<Deliverable, 'id' | 'scriptDue' | 'approvalDue' | 'postDate'>
type ApiInvoice = Nullable<NonNullable<Campaign['invoice']>, 'issuedAt'>
type ApiCampaign = Nullable<Omit<Campaign, 'deliverables' | 'invoice' | 'checklist'>, 'paymentDueDate' | 'paidAt' | 'closedAt'> & {
  deliverables: ApiDeliverable[]
  checklist: { id: string | null; text: string; done: boolean }[]
  invoice: ApiInvoice | null
}
type ApiProfile = Nullable<Profile, 'publicSlug'>

const fromDate = (d: string | null) => d ?? ''
const toDate = (d: string) => d || null
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Ids criados no navegador só são enviados se forem GUID; senão a API gera um. */
const toId = (id: string) => (GUID.test(id) ? id : null)

const fromCampaign = (c: ApiCampaign): Campaign => ({
  ...c,
  paymentDueDate: fromDate(c.paymentDueDate),
  paidAt: fromDate(c.paidAt),
  closedAt: fromDate(c.closedAt),
  deliverables: c.deliverables.map((d) => ({
    ...d,
    id: d.id ?? '',
    scriptDue: fromDate(d.scriptDue),
    approvalDue: fromDate(d.approvalDue),
    postDate: fromDate(d.postDate),
  })),
  checklist: c.checklist.map((i) => ({ ...i, id: i.id ?? '' })),
  invoice: c.invoice && { ...c.invoice, issuedAt: fromDate(c.invoice.issuedAt) },
})

const toCampaignInput = ({ id: _id, createdAt: _createdAt, ...c }: Campaign) => ({
  ...c,
  paymentDueDate: toDate(c.paymentDueDate),
  paidAt: toDate(c.paidAt),
  closedAt: toDate(c.closedAt),
  deliverables: c.deliverables.map((d) => ({
    ...d,
    id: toId(d.id),
    scriptDue: toDate(d.scriptDue),
    approvalDue: toDate(d.approvalDue),
    postDate: toDate(d.postDate),
  })),
  checklist: c.checklist.map((i) => ({ ...i, id: toId(i.id) })),
  invoice: c.invoice && { ...c.invoice, issuedAt: toDate(c.invoice.issuedAt) },
})

const fromProfile = (p: ApiProfile): Profile => ({ ...p, publicSlug: p.publicSlug ?? '' })
// Um hífen no fim (a pessoa ainda está digitando) é tirado antes de enviar.
const toProfile = (p: Profile): ApiProfile => ({ ...p, publicSlug: p.publicSlug.replace(/-+$/, '') || null })

type ApiPlan = Nullable<Plan, 'since' | 'checkoutUrl'>
const fromPlan = (p: ApiPlan): Plan => ({ ...p, since: p.since ?? '', checkoutUrl: p.checkoutUrl ?? '' })

export interface KitCase {
  brand: string
  views: number
  engagement: number
}

export interface PublicKit {
  profile: Profile
  cases: KitCase[]
}

// ---------- endpoints ----------

export const api = {
  register: (name: string, nickname: string, email: string, password: string) =>
    request<AuthResponse>('POST', '/api/auth/register', { name, nickname, email, password }),
  login: (email: string, password: string) => request<AuthResponse>('POST', '/api/auth/login', { email, password }),
  google: (credential: string) => request<AuthResponse>('POST', '/api/auth/google', { credential }),
  me: () => request<User>('GET', '/api/auth/me'),
  forgotPassword: (email: string) => request<void>('POST', '/api/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    request<AuthResponse>('POST', '/api/auth/reset-password', { token, newPassword }),
  verifyEmail: (token: string) => request<User>('POST', '/api/auth/verify-email', { token }),
  resendVerification: () => request<void>('POST', '/api/account/verify-email/resend'),
  updateAccount: (name: string, nickname: string, email: string) => request<User>('PUT', '/api/account', { name, nickname, email }),
  /** Encerra as sessões nos outros aparelhos e devolve a sessão nova deste. */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<AuthResponse>('PUT', '/api/account/password', { currentPassword, newPassword }),
  revokeSessions: () => request<AuthResponse>('POST', '/api/account/sessions/revoke'),
  deleteAccount: (confirmation: { password?: string; email?: string }) => request<void>('POST', '/api/account/delete', confirmation),

  campaigns: async () => (await request<ApiCampaign[]>('GET', '/api/campaigns')).map(fromCampaign),
  createCampaign: async (c: Campaign) => fromCampaign(await request<ApiCampaign>('POST', '/api/campaigns', toCampaignInput(c))),
  updateCampaign: async (c: Campaign) =>
    fromCampaign(await request<ApiCampaign>('PUT', `/api/campaigns/${c.id}`, toCampaignInput(c))),
  setStatus: async (id: string, status: CampaignStatus) =>
    fromCampaign(await request<ApiCampaign>('PATCH', `/api/campaigns/${id}/status`, { status })),
  patchDeliverable: (campaignId: string, deliverableId: string, patch: Partial<Record<DeliverableStep, boolean>> & { postUrl?: string; metrics?: PostMetrics }) =>
    request<ApiDeliverable>('PATCH', `/api/campaigns/${campaignId}/deliverables/${deliverableId}`, patch),
  deleteCampaign: (id: string) => request<void>('DELETE', `/api/campaigns/${id}`),
  deleteAllCampaigns: () => request<void>('DELETE', '/api/campaigns'),

  profile: async () => fromProfile(await request<ApiProfile>('GET', '/api/profile')),
  updateProfile: async (p: Profile) => fromProfile(await request<ApiProfile>('PUT', '/api/profile', toProfile(p))),
  settings: () => request<ReminderSettings>('GET', '/api/settings'),
  updateSettings: (s: ReminderSettings) => request<ReminderSettings>('PUT', '/api/settings', s),

  plan: async () => fromPlan(await request<ApiPlan>('GET', '/api/plan')),
  /** Com pagamento ativo, devolve checkoutUrl: a pessoa conclui a assinatura na página do Mercado Pago. */
  subscribe: async () => fromPlan(await request<ApiPlan>('POST', '/api/plan/subscribe')),
  cancelPlan: async () => fromPlan(await request<ApiPlan>('POST', '/api/plan/cancel')),

  publicKit: async (slug: string): Promise<PublicKit> => {
    const { cases, ...p } = await request<Omit<Profile, 'publicSlug' | 'showCases' | 'cnpj' | 'legalName' | 'municipality' | 'defaultIssRate'> & { cases: KitCase[] }>(
      'GET',
      `/api/public/kit/${encodeURIComponent(slug)}`,
    )
    return { profile: { ...emptyProfile(), ...p, publicSlug: slug }, cases }
  },
}
