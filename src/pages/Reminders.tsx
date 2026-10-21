import { useMemo } from 'react'
import { useStore } from '../store'
import { ReminderSettings } from '../types'
import { fmtDate, todayISO } from '../lib/format'
import { Severity, buildReminders } from '../lib/schedule'
import { Card, Empty, KindTag, PageHead, SeverityDot } from '../components/ui'

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
              <label className="field wide">
                <span>E-mail para o resumo diário</span>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  value={settings.email}
                  onChange={(e) => updateSettings({ email: e.target.value })}
                />
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
              <label className="field wide disabled">
                <span>
                  WhatsApp <span className="soon">em breve</span>
                </span>
                <input placeholder="(11) 90000-0000" value={settings.whatsapp} disabled />
              </label>
            </div>
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
                Para: {settings.email || 'seu e-mail'} · {settings.digestTime}
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
