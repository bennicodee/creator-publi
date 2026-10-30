import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { api } from '../lib/api'
import { Logo } from '../components/Logo'

/** Aberta pelo link do e-mail (#/confirmar-email/<token>). Funciona logada ou não (pode ser outro aparelho). */
export function ConfirmEmail({ token }: { token: string }) {
  const { user, setUser } = useAuth()
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .verifyEmail(token)
      .then((updated) => {
        if (user?.id === updated.id) setUser(updated)
        setState('ok')
      })
      .catch((e: Error) => {
        setError(e.message)
        setState('error')
      })
    // Só ao abrir o link; repetir a confirmação não muda nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <Logo />
        </div>
        <div className="auth-intro">
          <h1>{state === 'loading' ? 'Confirmando…' : state === 'ok' ? 'E-mail confirmado!' : 'Não deu certo'}</h1>
          <p className="muted">
            {state === 'loading'
              ? 'Só um instante.'
              : state === 'ok'
                ? 'Tudo certo. A partir de agora você recebe o resumo diário dos seus prazos neste e-mail.'
                : error}
          </p>
        </div>
        {state !== 'loading' && (
          <a href="#/" className="btn primary block">
            {user ? 'Abrir o CreatorPubli' : 'Entrar no CreatorPubli'}
          </a>
        )}
      </div>
    </div>
  )
}
