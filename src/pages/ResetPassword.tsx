import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { Logo } from '../components/Logo'
import { Icon } from '../components/ui'
import { navigate } from '../router'

/** Aberta pelo link do e-mail (#/redefinir-senha/<token>): define a senha nova e já entra no app. */
export function ResetPassword({ token }: { token: string }) {
  const { resetPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    if (password !== confirmPw) return setError('As senhas não conferem.')
    setBusy(true)
    try {
      await resetPassword(token, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.')
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
          <h1>Crie uma nova senha</h1>
          <p className="muted">Depois de salvar, você já entra no app com a senha nova.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            Nova senha
            <span className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}>
                <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
              </button>
            </span>
          </label>
          <label className="field">
            Confirmar nova senha
            <input
              type={showPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn primary block" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>

        <p className="muted small center auth-switch">
          <a href="#/" className="link-btn">
            ← Voltar para o login
          </a>
        </p>
      </div>
    </div>
  )
}
