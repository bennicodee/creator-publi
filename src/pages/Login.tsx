import { useEffect, useRef, useState, type FormEvent } from 'react'
import { GOOGLE_CLIENT_ID, useAuth } from '../auth'
import { api } from '../lib/api'
import { Logo } from '../components/Logo'
import { Icon } from '../components/ui'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void
          renderButton: (el: HTMLElement, o: Record<string, string | number>) => void
        }
      }
    }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'

/** Carrega o script do Google Identity Services uma única vez. */
function loadGsi() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) return resolve()
    let s = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (!s) {
      s = document.createElement('script')
      s.src = GSI_SRC
      s.async = true
      document.head.appendChild(s)
    }
    s.addEventListener('load', () => resolve())
    s.addEventListener('error', () => reject(new Error('gsi')))
  })
}

function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  const { signInWithGoogle } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = GOOGLE_CLIENT_ID
    if (!clientId) return
    let alive = true
    loadGsi()
      .then(() => {
        if (!alive || !ref.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (r) => {
            signInWithGoogle(r.credential).catch((e: Error) => onError(e.message || 'Não foi possível entrar com o Google.'))
          },
        })
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'pt-BR',
          width: ref.current.offsetWidth,
        })
      })
      .catch(() => alive && onError('Não foi possível carregar o login do Google.'))
    return () => {
      alive = false
    }
  }, [signInWithGoogle, onError])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button type="button" className="btn block google-btn" disabled title="Configure VITE_GOOGLE_CLIENT_ID no .env.local">
        <GoogleG /> Continuar com Google
      </button>
    )
  }
  return <div ref={ref} className="google-slot" />
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  )
}

/** Pede o link de redefinição. A resposta é sempre a mesma, exista ou não a conta. */
function ForgotPassword({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <Logo />
        </div>
        <div className="auth-intro">
          <h1>{sent ? 'Confira seu e-mail' : 'Esqueceu a senha?'}</h1>
          <p className="muted">
            {sent
              ? `Se existir uma conta com ${email.trim()}, enviamos um link para criar uma nova senha. Ele vale por 1 hora.`
              : 'Digite o e-mail da sua conta e enviamos um link para você criar uma nova senha.'}
          </p>
        </div>

        {sent ? (
          <div className="auth-form">
            <p className="muted small center">
              Não chegou? Olhe a caixa de spam ou{' '}
              <button type="button" className="link-btn" onClick={() => setSent(false)}>
                tente de novo
              </button>
              .
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label className="field">
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
            </label>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn primary block" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar link'}
            </button>
          </form>
        )}

        <p className="muted small center auth-switch">
          <button type="button" className="link-btn" onClick={onBack}>
            ← Voltar para o login
          </button>
        </p>
      </div>
    </div>
  )
}

export function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'entrar' | 'criar' | 'esqueci'>('entrar')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const creating = mode === 'criar'

  const switchMode = (m: typeof mode) => {
    setMode(m)
    setError('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (creating) {
      if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
      if (password !== confirmPw) return setError('As senhas não conferem.')
    }
    setBusy(true)
    try {
      await (creating ? signUp(name, email, password) : signIn(email, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'esqueci') return <ForgotPassword initialEmail={email} onBack={() => switchMode('entrar')} />

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <Logo />
        </div>
        <div className="auth-intro">
          <h1>{creating ? 'Crie sua conta' : 'Que bom te ver de novo'}</h1>
          <p className="muted">
            {creating ? 'Organize suas publis em um só lugar.' : 'Entre para ver suas campanhas.'}
          </p>
        </div>

        <div className="segmented auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!creating} className={!creating ? 'on' : ''} onClick={() => switchMode('entrar')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={creating} className={creating ? 'on' : ''} onClick={() => switchMode('criar')}>
            Criar conta
          </button>
        </div>

        <GoogleButton onError={setError} />

        <div className="auth-divider">
          <span>ou com e-mail</span>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {creating && (
            <label className="field">
              Nome
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="field">
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            Senha
            <span className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={creating ? 'new-password' : 'current-password'}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}>
                <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
              </button>
            </span>
          </label>
          {!creating && (
            <button type="button" className="link-btn forgot-link" onClick={() => switchMode('esqueci')}>
              Esqueci minha senha
            </button>
          )}
          {creating && (
            <label className="field">
              Confirmar senha
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn primary block" disabled={busy}>
            {busy ? 'Aguarde…' : creating ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="muted small center auth-switch">
          {creating ? 'Já tem conta? ' : 'Ainda não tem conta? '}
          <button type="button" className="link-btn" onClick={() => switchMode(creating ? 'entrar' : 'criar')}>
            {creating ? 'Entrar' : 'Criar agora'}
          </button>
        </p>
      </div>
    </div>
  )
}
