import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Campaign, CampaignStatus, Deliverable, DeliverableStep, Plan, Profile, ReminderSettings, isClosed } from './types'
import { defaultSettings, emptyCampaign, emptyDeliverable, emptyProfile, seedCampaigns, seedProfile } from './lib/seed'
import { todayISO } from './lib/format'

interface State {
  campaigns: Campaign[]
  settings: ReminderSettings
  profile: Profile
  plan: Plan
}

interface Store extends State {
  save: (c: Campaign) => void
  patchCampaign: (id: string, patch: Partial<Campaign>) => void
  patchDeliverable: (campaignId: string, deliverableId: string, patch: Partial<Deliverable>) => void
  remove: (id: string) => void
  setStatus: (id: string, status: CampaignStatus) => void
  toggleStep: (campaignId: string, deliverableId: string, step: DeliverableStep) => void
  updateSettings: (patch: Partial<ReminderSettings>) => void
  updateProfile: (patch: Partial<Profile>) => void
  subscribe: () => void
  cancelPlan: () => void
  loadDemo: () => void
  clearAll: () => void
}

const KEY = 'creatorpubli:v1'

/** Completa campos que não existiam em versões anteriores dos dados salvos. */
const migrateCampaign = (c: Campaign): Campaign => ({
  ...emptyCampaign(),
  ...c,
  deliverables: (c.deliverables ?? []).map((d) => ({ ...emptyDeliverable(), ...d })),
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>
      const base = emptyProfile()
      return {
        campaigns: (parsed.campaigns ?? []).map(migrateCampaign),
        settings: { ...defaultSettings, ...parsed.settings },
        profile: parsed.profile
          ? { ...base, ...parsed.profile, networks: { ...base.networks, ...parsed.profile.networks } }
          : seedProfile(),
        plan: parsed.plan ?? { active: false, since: '' },
      }
    }
  } catch {
    // storage indisponível ou corrompido: cai nos dados de exemplo
  }
  return { campaigns: seedCampaigns(), settings: defaultSettings, profile: seedProfile(), plan: { active: false, since: '' } }
}

/** Mantém closedAt/paidAt coerentes com o status. */
function normalize(c: Campaign): Campaign {
  const today = todayISO()
  return {
    ...c,
    closedAt: isClosed(c.status) ? c.closedAt || today : '',
    paidAt: c.status === 'paga' ? c.paidAt || today : '',
  }
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // sem persistência neste navegador
    }
  }, [state])

  const store = useMemo<Store>(() => {
    const mapCampaign = (id: string, fn: (c: Campaign) => Campaign) =>
      setState((s) => ({ ...s, campaigns: s.campaigns.map((c) => (c.id === id ? fn(c) : c)) }))

    return {
      ...state,
      save: (c) =>
        setState((s) => {
          const exists = s.campaigns.some((x) => x.id === c.id)
          const next = normalize(c)
          return {
            ...s,
            campaigns: exists ? s.campaigns.map((x) => (x.id === c.id ? next : x)) : [next, ...s.campaigns],
          }
        }),
      patchCampaign: (id, patch) => mapCampaign(id, (c) => normalize({ ...c, ...patch })),
      patchDeliverable: (campaignId, deliverableId, patch) =>
        mapCampaign(campaignId, (c) => ({
          ...c,
          deliverables: c.deliverables.map((d) => (d.id === deliverableId ? { ...d, ...patch } : d)),
        })),
      remove: (id) => setState((s) => ({ ...s, campaigns: s.campaigns.filter((c) => c.id !== id) })),
      setStatus: (id, status) => mapCampaign(id, (c) => normalize({ ...c, status })),
      toggleStep: (campaignId, deliverableId, step) =>
        mapCampaign(campaignId, (c) => ({
          ...c,
          deliverables: c.deliverables.map((d) => (d.id === deliverableId ? { ...d, [step]: !d[step] } : d)),
        })),
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      updateProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      subscribe: () => setState((s) => ({ ...s, plan: { active: true, since: todayISO() } })),
      cancelPlan: () => setState((s) => ({ ...s, plan: { active: false, since: '' } })),
      loadDemo: () => setState((s) => ({ ...s, campaigns: seedCampaigns(), profile: seedProfile() })),
      clearAll: () => setState((s) => ({ ...s, campaigns: [] })),
    }
  }, [state])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do StoreProvider')
  return s
}
