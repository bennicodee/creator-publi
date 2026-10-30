import { useMemo } from 'react'
import { useStore } from '../store'
import { useAuth } from '../auth'
import { ReminderSettings } from '../types'
import { fmtDate, todayISO } from '../lib/format'
import { Severity, buildReminders, digestText } from '../lib/schedule'
import { waLink } from '../lib/whatsapp'
import { Card, Empty, Icon, KindTag, PageHead, SeverityDot } from '../components/ui'
import { Premium, PremiumBadge } from '../components/Premium'

const GROUPS: { id: Severity; label: string }[] = [
  { id: 'atrasado', label: 'Atrasados' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'proximo', label: 'Próximos dias' },
]

const TOGGLES: { key: keyof ReminderSettings; label: string; example: string }[] = [
  { key: 'notifyScript', label: 'Envio de roteiro', example: '“Roteiro da marca X vence amanhã”' },
  { key: 'notifyApproval', label: 'Aprovação', example: '“Aprovação da marca X prevista para hoje”' },
  { key: 'notifyPost', label: 'Postagem', example: '“Post agendado hoje”' },
  { key: 'notifyPayment', label: 'Cobrança', example: '“Pagamento da campanha Y atrasado há 15 dias”' },
]

export function Reminders() {
  const { campaigns, settings, updateSettings } = useStore()
  const { user } = useAuth()
  const today = todayISO()
  const reminders = useMemo(() => buildReminders(campaigns, today, settings), [campaigns, today, settings])
  const urgent = reminders.filter((r) => r.severity !== 'proximo')

  return (
    <>
      <PageHead title="Lembretes" subtitle="O que vence, o que atrasou e quem precisa ser cobrado." />

      <div className="grid-2 wide-left">
        <Card title="Agora">
          {reminders.length === 0 ? (
            <Empty>Nenhum lembrete ativo.</Empty>
          ) : (
            GROUPS.map((g) => {
              const list = reminders.filter((r) => r.severity === g.id)
              if (list.length === 0) return null
              return (
                <div key={g.id} className="reminder-group">
                  <h3>
                    <SeverityDot severity={g.id} /> {g.label} <span className="muted">({list.length})</span>
                  </h3>
                  <ul className="reminder-list">
                    {list.map((r) => (
                      <li key={r.id}>
                        <KindTag kind={r.kind} />
                        <a href={`#/campanhas/${r.event.campaign.id}`}>{r.text}</a>
                        <span className="muted small">{fmtDate(r.date)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </Card>

        <div className="stack">
          <Card title="Como avisar">
            <div className="form-grid">
              {/* settings.email preenchido = resumo ligado; o envio vai sempre para o e-mail confirmado da conta. */}
              <label className="switch wide">
                <input
                  type="checkbox"
                  checked={settings.email !== ''}
                  onChange={(e) => updateSettings({ email: e.target.checked ? user!.email : '' })}
                />
                <span className="switch-track" />
                <span>
                  <strong>Resumo diário por e-mail</strong>
                  <span className="muted small block">
                    {user!.emailVerified
                      ? `Enviado para ${user!.email}, só nos dias com algo pendente.`
                      : `Confirme o e-mail ${user!.email} (link no aviso do topo) para começar a receber.`}{' '}
                    Para trocar o endereço, vá em <a href="#/conta" className="link">Minha conta</a>.
                  </span>
                </span>
              </label>
              <label className="field">
                <span>Horário do resumo</span>
                <input type="time" value={settings.digestTime} onChange={(e) => updateSettings({ digestTime: e.target.value })} />
              </label>
              <label className="field">
                <span>Avisar com antecedência</span>
                <select value={settings.daysBefore} onChange={(e) => updateSettings({ daysBefore: Number(e.target.value) })}>
                  {[1, 2, 3, 5, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'dia' : 'dias'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card
            title={
              <span className="row gap">
                <Icon name="whatsapp" /> WhatsApp <PremiumBadge />
              </span>
            }
          >
            <Premium feature="Lembretes por WhatsApp" description="Monte o resumo do dia e os alertas de cobrança prontos para enviar no seu WhatsApp.">
              <div className="form-grid">
                <label className="field wide">
                  <span>Seu número</span>
                  <input
                    placeholder="(11) 90000-0000"
                    value={settings.whatsapp}
                    onChange={(e) => updateSettings({ whatsapp: e.target.value })}
                  />
                </label>
                <label className="switch wide">
                  <input type="checkbox" checked={false} disabled />
                  <span className="switch-track" />
                  <span>
                    <strong>
                      Envio automático às {settings.digestTime} <span className="soon-badge">em breve</span>
                    </strong>
                    <span className="muted small block">
                      Por enquanto, use o botão abaixo: ele abre o WhatsApp com o resumo pronto para enviar.
                    </span>
                  </span>
                </label>
              </div>
              <pre className="wa-preview">{digestText(reminders)}</pre>
              <a
                className="btn primary block"
                href={waLink(settings.whatsapp, digestText(reminders))}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" size={16} /> Enviar resumo agora
              </a>
            </Premium>
          </Card>

          <Card title="O que avisar">
            <ul className="toggle-list">
              {TOGGLES.map((t) => (
                <li key={t.key}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={Boolean(settings[t.key])}
                      onChange={(e) => updateSettings({ [t.key]: e.target.checked })}
                    />
                    <span className="switch-track" />
                    <span>
                      <strong>{t.label}</strong>
                      <span className="muted small block">{t.example}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Prévia do e-mail de hoje">
            <div className="email-preview">
              <div className="email-meta small muted">
                {settings.email ? `Para: ${user!.email} · ${settings.digestTime}` : 'Resumo por e-mail desligado'}
              </div>
              <strong>
                {urgent.length > 0 ? `⚠ ${urgent.length} coisa(s) pra hoje no CreatorPubli` : 'Seu dia no CreatorPubli'}
              </strong>
              {reminders.length === 0 ? (
                <p className="muted">Nada pendente. Bom dia!</p>
              ) : (
                <ul>
                  {reminders.slice(0, 6).map((r) => (
                    <li key={r.id}>{r.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
