import { useMemo, useState } from 'react'
import { useRoute } from './router'
import { StoreProvider, useStore } from './store'
import { useAuth, type User } from './auth'
import { buildReminders } from './lib/schedule'
import { todayISO } from './lib/format'
import { Icon, IconName } from './components/ui'
import { Logo } from './components/Logo'
import { SignOutButton } from './components/SignOutButton'
import { Dashboard } from './pages/Dashboard'
import { Campaigns } from './pages/Campaigns'
import { CampaignEditor } from './pages/CampaignEditor'
import { CalendarPage } from './pages/CalendarPage'
import { Finance } from './pages/Finance'
import { Reminders } from './pages/Reminders'
import { Plan } from './pages/Plan'
import { Metrics } from './pages/Metrics'
import { MediaKit, MediaKitPublic } from './pages/MediaKit'
import { Invoices } from './pages/Invoices'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { Account } from './pages/Account'
import { ConfirmEmail } from './pages/ConfirmEmail'
import { Privacy, Terms } from './pages/Legal'
import { api } from './lib/api'

const NAV: { to: string; label: string; icon: IconName; premium?: boolean }[] = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/campanhas', label: 'Campanhas', icon: 'campaigns' },
  { to: '/calendario', label: 'Calendário', icon: 'calendar' },
  { to: '/financeiro', label: 'Financeiro', icon: 'money' },
  { to: '/lembretes', label: 'Lembretes', icon: 'bell' },
  { to: '/metricas', label: 'Métricas', icon: 'chart', premium: true },
  { to: '/midia-kit', label: 'Mídia kit', icon: 'kit', premium: true },
  { to: '/notas', label: 'Notas fiscais', icon: 'invoice', premium: true },
]

function Page({ path }: { path: string }) {
  const m = path.match(/^\/campanhas\/(.+)$/)
  if (m) return <CampaignEditor id={m[1]} key={m[1]} />
  switch (path) {
    case '/campanhas':
      return <Campaigns />
    case '/calendario':
      return <CalendarPage />
    case '/financeiro':
      return <Finance />
    case '/lembretes':
      return <Reminders />
    case '/plano':
      return <Plan />
    case '/metricas':
      return <Metrics />
    case '/midia-kit':
      return <MediaKit />
    case '/notas':
      return <Invoices />
    case '/conta':
      return <Account />
    default:
      return <Dashboard />
  }
}

export default function App() {
  const path = useRoute()
  const { user } = useAuth()

  const kit = path.match(/^\/kit\/([^/]+)$/)
  if (kit) return <MediaKitPublic slug={decodeURIComponent(kit[1])} />
  const reset = path.match(/^\/redefinir-senha\/([^/]+)$/)
  if (reset) return <ResetPassword token={reset[1]} />
  const confirm = path.match(/^\/confirmar-email\/([^/]+)$/)
  if (confirm) return <ConfirmEmail token={confirm[1]} />
  if (path === '/termos') return <Terms />
  if (path === '/privacidade') return <Privacy />
  if (!user) return <Login />

  // key: trocar de conta descarta os dados da conta anterior.
  return (
    <StoreProvider key={user.id}>
      <Shell path={path} user={user} />
    </StoreProvider>
  )
}

/** Até confirmar o e-mail, a pessoa não recebe o resumo diário; o aviso permite pedir o link de novo. */
function VerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const resend = () => {
    setState('sending')
    api.resendVerification().then(() => setState('sent'), () => setState('error'))
  }
  return (
    <div className="verify-banner" role="status">
      <span>
        Confirme seu e-mail: enviamos um link para <strong>{email}</strong>. Sem isso, o resumo diário de prazos não é enviado.
      </span>
      {state === 'sent' ? (
        <span>Link enviado! Olhe também o spam.</span>
      ) : (
        <button type="button" className="link-btn" onClick={resend} disabled={state === 'sending'}>
          {state === 'sending' ? 'Enviando…' : state === 'error' ? 'Não deu certo, tentar de novo' : 'Reenviar link'}
        </button>
      )}
    </div>
  )
}

function Shell({ path, user }: { path: string; user: User }) {
  const { campaigns, settings, plan, status, error, dismissError, reload } = useStore()
  const urgent = useMemo(
    () => buildReminders(campaigns, todayISO(), settings).filter((r) => r.severity !== 'proximo').length,
    [campaigns, settings],
  )
  const isActive = (to: string) => (to === '/' ? path === '/' : path.startsWith(to))

  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="#/" className="logo" aria-label="CreatorPubli — início">
          <Logo />
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} className={`nav-link ${isActive(n.to) ? 'active' : ''}`}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.to === '/lembretes' && urgent > 0 && <span className="nav-count">{urgent}</span>}
              {n.premium && !plan.active && (
                <span className="nav-lock">
                  <Icon name="lock" size={13} />
                </span>
              )}
            </a>
          ))}
          <a href="#/plano" className={`nav-link nav-plan-mobile ${isActive('/plano') ? 'active' : ''}`}>
            <Icon name="star" />
            <span>Plano</span>
          </a>
        </nav>
        <a href="#/plano" className={`plan-pill ${isActive('/plano') ? 'active' : ''}`}>
          <Icon name="star" size={16} />
          <span>
            {plan.active ? 'Creator ativo' : 'Plano Creator'} <small>{plan.active ? 'tudo liberado ✨' : 'R$ 11,99/mês'}</small>
          </span>
        </a>
        <div className={`user-pill ${isActive('/conta') ? 'active' : ''}`}>
          <a href="#/conta" className="user-link" title="Minha conta">
            {user.picture ? (
              <img src={user.picture} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            )}
            <span className="user-info">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
          </a>
          <SignOutButton className="icon-btn" title="Sair">
            <Icon name="logout" size={16} />
          </SignOutButton>
        </div>
      </aside>
      <main className="content">
        {user.emailVerified === false && <VerifyBanner email={user.email} />}
        {error && status !== 'error' && (
          <div className="api-error" role="alert">
            <span>{error}</span>
            <button className="icon-btn" onClick={dismissError} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}
        {status === 'loading' && <p className="empty">Carregando suas campanhas…</p>}
        {status === 'error' && (
          <div className="empty">
            <p>{error || 'Não foi possível carregar seus dados.'}</p>
            <button className="btn" onClick={reload}>
              Tentar de novo
            </button>
          </div>
        )}
        {status === 'ready' && <Page path={path} />}
      </main>
    </div>
  )
}
