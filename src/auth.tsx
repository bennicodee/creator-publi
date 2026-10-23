import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface User {
  id: string
  name: string
  email: string
  provider: 'senha' | 'google'
  picture?: string
}

interface Account extends User {
  /** SHA-256 de salt + senha; vazio em contas Google. */
  hash: string
  salt: string
}

interface AuthState {
  accounts: Account[]
  sessionId: string
}

interface Auth {
  user: User | null
  signUp: (name: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: (credential: string) => void
  signOut: () => void
}

const KEY = 'creatorpubli:auth'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function load(): AuthState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { accounts: [], sessionId: '', ...(JSON.parse(raw) as Partial<AuthState>) }
  } catch {
    // storage indisponível ou corrompido: começa sem contas
  }
  return { accounts: [], sessionId: '' }
}

const normEmail = (e: string) => e.trim().toLowerCase()

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function hashPassword(password: string, salt: string) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`)))
}

/** Lê o payload do ID token do Google (JWT). A assinatura só pode ser validada num backend. */
function decodeJwt(token: string): Record<string, string> {
  const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

const publicUser = ({ hash: _h, salt: _s, ...u }: Account): User => u

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // sem persistência neste navegador
    }
  }, [state])

  const auth = useMemo<Auth>(() => {
    const current = state.accounts.find((a) => a.id === state.sessionId)
    const byEmail = (email: string) => state.accounts.find((a) => a.email === normEmail(email))

    return {
      user: current ? publicUser(current) : null,
      signUp: async (name, email, password) => {
        if (byEmail(email)) throw new Error('Já existe uma conta com esse e-mail.')
        const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
        const account: Account = {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: normEmail(email),
          provider: 'senha',
          salt,
          hash: await hashPassword(password, salt),
        }
        setState((s) => ({ accounts: [...s.accounts, account], sessionId: account.id }))
      },
      signIn: async (email, password) => {
        const account = byEmail(email)
        if (!account || !account.hash || account.hash !== (await hashPassword(password, account.salt))) {
          throw new Error(
            account && !account.hash ? 'Essa conta usa login com Google.' : 'E-mail ou senha incorretos.',
          )
        }
        setState((s) => ({ ...s, sessionId: account.id }))
      },
      signInWithGoogle: (credential) => {
        const p = decodeJwt(credential)
        const existing = byEmail(p.email)
        const account: Account = existing
          ? { ...existing, picture: p.picture || existing.picture }
          : { id: crypto.randomUUID(), name: p.name || p.email, email: normEmail(p.email), provider: 'google', picture: p.picture, hash: '', salt: '' }
        setState((s) => ({
          accounts: existing ? s.accounts.map((a) => (a.id === account.id ? account : a)) : [...s.accounts, account],
          sessionId: account.id,
        }))
      },
      signOut: () => setState((s) => ({ ...s, sessionId: '' })),
    }
  }, [state])

  return <Ctx.Provider value={auth}>{children}</Ctx.Provider>
}

export function useAuth() {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth fora do AuthProvider')
  return a
}
