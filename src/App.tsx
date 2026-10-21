import { useMemo } from 'react'
import { useRoute } from './router'
import { useStore } from './store'
import { buildReminders } from './lib/schedule'
import { todayISO } from './lib/format'
import { Icon, IconName } from './components/ui'
import { Dashboard } from './pages/Dashboard'
import { Campaigns } from './pages/Campaigns'
import { CampaignEditor } from './pages/CampaignEditor'
import { CalendarPage } from './pages/CalendarPage'
import { Finance } from './pages/Finance'
import { Reminders } from './pages/Reminders'
import { Plan } from './pages/Plan'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/campanhas', label: 'Campanhas', icon: 'campaigns' },
  { to: '/calendario', label: 'Calendário', icon: 'calendar' },
  { to: '/financeiro', label: 'Financeiro', icon: 'money' },
  { to: '/lembretes', label: 'Lembretes', icon: 'bell' },
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
    default:
      return <Dashboard />
  }
}

export default function App() {
  const path = useRoute()
  const { campaigns, settings } = useStore()
  const urgent = useMemo(
    () => buildReminders(campaigns, todayISO(), settings).filter((r) => r.severity !== 'proximo').length,
    [campaigns, settings],
  )
  const isActive = (to: string) => (to === '/' ? path === '/' : path.startsWith(to))

  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="#/" className="logo">
          <span className="logo-mark">P</span>
          <span>CreatorPubli</span>
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} className={`nav-link ${isActive(n.to) ? 'active' : ''}`}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.to === '/lembretes' && urgent > 0 && <span className="nav-count">{urgent}</span>}
            </a>
          ))}
        </nav>
        <a href="#/plano" className={`plan-pill ${isActive('/plano') ? 'active' : ''}`}>
          <Icon name="star" size={16} />
          <span>
            Plano Creator <small>R$ 11,99/mês</small>
          </span>
        </a>
      </aside>
      <main className="content">
        <Page path={path} />
      </main>
    </div>
  )
}
