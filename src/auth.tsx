import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setToken, setUnauthorizedHandler, type AuthResponse, type User } from './lib/api'

export type { User }

interface Session {
  token: string
  user: User
}

interface Auth {
  user: User | null
  signUp: (name: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: (credential: string) => Promise<void>
  /** Define a senha nova com o token do e-mail de "esqueci minha senha" e já entra. */
  resetPassword: (token: string, newPassword: string) => Promise<void>
  signOut: () => void
  /** Atualiza nome/e-mail/senha mostrados no app depois de salvar em Minha conta. */
  setUser: (user: User) => void
}

const KEY = 'creatorpubli:session'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function load(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Session
      // Já deixa o token pronto para as primeiras chamadas da API.
      setToken(s.token)
      return s
    }
  } catch {
    // storage indisponível ou corrompido: começa deslogado
  }
  return null
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(load)

  useEffect(() => {
    // Atualizado em efeito: o StoreProvider que sai no logout ainda grava o que estava pendente com o token antigo.
    setToken(session?.token ?? '')
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session))
      else localStorage.removeItem(KEY)
    } catch {
      // sem persistência neste navegador
    }
  }, [session])

  useEffect(() => {
    setUnauthorizedHandler(() => setSession(null))
    // Confere se o token salvo ainda vale e atualiza nome/foto.
    if (session) api.me().then((user) => setSession((s) => s && { ...s, user })).catch(() => {})
  }, [])

  const auth = useMemo<Auth>(() => {
    const start = ({ token, user }: AuthResponse) => {
      setToken(token)
      setSession({ token, user })
    }
    return {
      user: session?.user ?? null,
      signUp: async (name, email, password) => start(await api.register(name, email, password)),
      signIn: async (email, password) => start(await api.login(email, password)),
      signInWithGoogle: async (credential) => start(await api.google(credential)),
      resetPassword: async (token, newPassword) => start(await api.resetPassword(token, newPassword)),
      signOut: () => setSession(null),
      setUser: (user) => setSession((s) => s && { ...s, user }),
    }
  }, [session])

  return <Ctx.Provider value={auth}>{children}</Ctx.Provider>
}

export function useAuth() {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth fora do AuthProvider')
  return a
}
