import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Campaign, CampaignStatus, Deliverable, DeliverableStep, Plan, Profile, ReminderSettings, isClosed, noPlan } from './types'
import { defaultSettings, emptyProfile, seedCampaigns, seedProfile } from './lib/seed'
import { todayISO } from './lib/format'
import { api } from './lib/api'

interface State {
  campaigns: Campaign[]
  settings: ReminderSettings
  profile: Profile
  plan: Plan
}

interface Store extends State {
  /** loading até a primeira carga da API terminar. */
  status: 'loading' | 'ready' | 'error'
  /** Última falha ao falar com a API; a tela mostra um aviso. */
  error: string
  dismissError: () => void
  reload: () => void
  save: (c: Campaign) => void
  patchCampaign: (id: string, patch: Partial<Campaign>) => void
  patchDeliverable: (campaignId: string, deliverableId: string, patch: Partial<Deliverable>) => void
  remove: (id: string) => void
  setStatus: (id: string, status: CampaignStatus) => void
  toggleStep: (campaignId: string, deliverableId: string, step: DeliverableStep) => void
  updateSettings: (patch: Partial<ReminderSettings>) => void
  updateProfile: (patch: Partial<Profile>) => void
  /** Com pagamento ativo, leva para a página do Mercado Pago. */
  subscribe: () => Promise<void>
  cancelPlan: () => void
  loadDemo: () => void
  clearAll: () => void
}

/** Campos digitados letra a letra só vão para a API depois dessa pausa. */
const SAVE_DELAY = 600

const initial: State = { campaigns: [], settings: defaultSettings, profile: emptyProfile(), plan: noPlan }

async function fetchAll(): Promise<State> {
  const [campaigns, profile, settings, plan] = await Promise.all([api.campaigns(), api.profile(), api.settings(), api.plan()])
  return { campaigns, profile, settings, plan }
}

/** Mantém closedAt/paidAt coerentes com o status (a API aplica a mesma regra). */
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
  const [state, setState] = useState<State>(initial)
  const [status, setLoadStatus] = useState<Store['status']>('loading')
  const [error, setError] = useState('')
  // Estado mais recente para as gravações adiadas, que rodam fora do ciclo de render.
  const latest = useRef(state)
  latest.current = state
  const timers = useRef(new Map<string, { id: ReturnType<typeof setTimeout>; run: () => void }>())

  const reload = useCallback(() => {
    fetchAll()
      .then((s) => {
        setState(s)
        setLoadStatus('ready')
      })
      .catch((e: Error) => {
        setError(e.message)
        setLoadStatus((st) => (st === 'loading' ? 'error' : st))
      })
  }, [])

  useEffect(() => {
    reload()
    const pending = timers.current
    // Ao sair (logout), grava o que ainda estava esperando.
    return () => {
      pending.forEach((t) => {
        clearTimeout(t.id)
        t.run()
      })
      pending.clear()
    }
  }, [reload])

  const store = useMemo<Store>(() => {
    /** Mostra o erro e recarrega do servidor, para a tela não ficar diferente do banco. */
    const fail = (e: Error) => {
      setError(e.message)
      reload()
    }

    const later = (key: string, run: () => Promise<unknown>) => {
      const t = timers.current
      const prev = t.get(key)
      if (prev) clearTimeout(prev.id)
      const go = () => {
        t.delete(key)
        run().catch(fail)
      }
      t.set(key, { id: setTimeout(go, SAVE_DELAY), run: go })
    }

    const replaceCampaign = (id: string, next: Campaign) =>
      setState((s) => ({ ...s, campaigns: s.campaigns.map((c) => (c.id === id ? next : c)) }))

    const mapCampaign = (id: string, fn: (c: Campaign) => Campaign) =>
      setState((s) => ({ ...s, campaigns: s.campaigns.map((c) => (c.id === id ? fn(c) : c)) }))

    /** Grava a campanha inteira depois que a pessoa para de digitar. */
    const saveCampaignLater = (id: string) =>
      later(`campaign:${id}`, async () => {
        const c = latest.current.campaigns.find((x) => x.id === id)
        if (c) replaceCampaign(id, await api.updateCampaign(c))
      })

    return {
      ...state,
      status,
      error,
      dismissError: () => setError(''),
      reload,
      save: (c) => {
        const exists = state.campaigns.some((x) => x.id === c.id)
        const next = normalize(c)
        setState((s) => ({
          ...s,
          campaigns: exists ? s.campaigns.map((x) => (x.id === c.id ? next : x)) : [next, ...s.campaigns],
        }))
        // A resposta traz os ids definitivos de campanha, entregáveis e itens.
        ;(exists ? api.updateCampaign(next) : api.createCampaign(next)).then((saved) => replaceCampaign(c.id, saved)).catch(fail)
      },
      patchCampaign: (id, patch) => {
        mapCampaign(id, (c) => normalize({ ...c, ...patch }))
        saveCampaignLater(id)
      },
      patchDeliverable: (campaignId, deliverableId, patch) => {
        mapCampaign(campaignId, (c) => ({
          ...c,
          deliverables: c.deliverables.map((d) => (d.id === deliverableId ? { ...d, ...patch } : d)),
        }))
        saveCampaignLater(campaignId)
      },
      remove: (id) => {
        setState((s) => ({ ...s, campaigns: s.campaigns.filter((c) => c.id !== id) }))
        api.deleteCampaign(id).catch(fail)
      },
      setStatus: (id, status) => {
        mapCampaign(id, (c) => normalize({ ...c, status }))
        api.setStatus(id, status).then((saved) => replaceCampaign(id, saved)).catch(fail)
      },
      toggleStep: (campaignId, deliverableId, step) => {
        const d = state.campaigns.find((c) => c.id === campaignId)?.deliverables.find((x) => x.id === deliverableId)
        if (!d) return
        const value = !d[step]
        mapCampaign(campaignId, (c) => ({
          ...c,
          deliverables: c.deliverables.map((x) => (x.id === deliverableId ? { ...x, [step]: value } : x)),
        }))
        api.patchDeliverable(campaignId, deliverableId, { [step]: value }).catch(fail)
      },
      updateSettings: (patch) => {
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
        later('settings', () => api.updateSettings(latest.current.settings))
      },
      updateProfile: (patch) => {
        setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
        later('profile', () => api.updateProfile(latest.current.profile))
      },
      subscribe: async () => {
        try {
          const plan = await api.subscribe()
          // Pagamento real: a assinatura é concluída na página do Mercado Pago, que depois devolve para #/plano.
          if (plan.checkoutUrl) window.location.assign(plan.checkoutUrl)
          else setState((s) => ({ ...s, plan }))
        } catch (e) {
          fail(e as Error)
        }
      },
      cancelPlan: () => {
        setState((s) => ({ ...s, plan: { ...noPlan, paymentsEnabled: s.plan.paymentsEnabled, subscriptionsOpen: s.plan.subscriptionsOpen } }))
        api.cancelPlan().then((plan) => setState((s) => ({ ...s, plan }))).catch(fail)
      },
      loadDemo: async () => {
        try {
          await api.deleteAllCampaigns()
          // Em sequência, para manter a ordem dos exemplos.
          for (const c of seedCampaigns().reverse()) await api.createCampaign(c)
          await api.updateProfile({ ...seedProfile(), publicSlug: latest.current.profile.publicSlug })
        } catch (e) {
          setError((e as Error).message)
        }
        reload()
      },
      clearAll: () => {
        setState((s) => ({ ...s, campaigns: [] }))
        api.deleteAllCampaigns().catch(fail)
      },
    }
  }, [state, status, error, reload])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do StoreProvider')
  return s
}
