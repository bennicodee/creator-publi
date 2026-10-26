import { useState, type ReactNode } from 'react'
import { useStore } from '../store'
import { Campaign, DELIVERABLE_TYPES, Deliverable, PAYMENT_METHODS, PostMetrics, STATUSES } from '../types'
import { emptyCampaign, emptyDeliverable } from '../lib/seed'
import { analyzeBriefing } from '../lib/assistant'
import { uid } from '../lib/format'
import { Card, Empty, Icon, StatusBadge } from '../components/ui'
import { Premium, PremiumBadge } from '../components/Premium'
import { navigate } from '../router'

const METRIC_FIELDS: [keyof PostMetrics, string][] = [
  ['views', 'Views'],
  ['likes', 'Curtidas'],
  ['comments', 'Coment.'],
  ['shares', 'Compart.'],
  ['saves', 'Salvos'],
]

const EMPTY_METRICS: PostMetrics = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }

/** Um link de post publicado já confirma a postagem. */
const isPostUrl = (url: string) => /(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)\/\S+/i.test(url)

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function CampaignEditor({ id }: { id: string }) {
  const { campaigns, save, remove, plan } = useStore()
  const existing = campaigns.find((c) => c.id === id)
  const isNew = id === 'nova'
  const [draft, setDraft] = useState<Campaign>(() => existing ?? emptyCampaign())
  const [copied, setCopied] = useState(false)
  const [newItem, setNewItem] = useState('')

  if (!isNew && !existing) {
    return (
      <Empty>
        Campanha não encontrada. <a href="#/campanhas">Voltar para campanhas</a>
      </Empty>
    )
  }

  const set = <K extends keyof Campaign>(k: K, v: Campaign[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setDel = (delId: string, patch: Partial<Deliverable>) =>
    setDraft((d) => ({ ...d, deliverables: d.deliverables.map((x) => (x.id === delId ? { ...x, ...patch } : x)) }))

  const setMetric = (d: Deliverable, key: keyof PostMetrics, value: number) =>
    setDel(d.id, { metrics: { ...(d.metrics ?? EMPTY_METRICS), [key]: value } })

  const runAssistant = () => {
    if ((draft.checklist.length > 0 || draft.script) && !confirm('Substituir o checklist e o roteiro atuais?')) return
    const a = analyzeBriefing(draft)
    setDraft((d) => ({ ...d, checklist: a.checklist.map((text) => ({ id: uid(), text, done: false })), script: a.script }))
  }

  const addChecklistItem = () => {
    const text = newItem.trim()
    if (!text) return
    set('checklist', [...draft.checklist, { id: uid(), text, done: false }])
    setNewItem('')
  }

  const canSave = draft.brand.trim().length > 0

  const onSave = () => {
    if (!canSave) return
    save({ ...draft, brand: draft.brand.trim() })
    navigate('/campanhas')
  }

  const onDelete = () => {
    if (confirm(`Excluir a campanha ${draft.brand}? Isso não pode ser desfeito.`)) {
      remove(draft.id)
      navigate('/campanhas')
    }
  }

  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(draft.couponLink || draft.couponCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard bloqueado
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <a href="#/campanhas" className="back-link">
            <Icon name="back" size={16} /> Campanhas
          </a>
          <h1>{isNew ? 'Nova campanha' : draft.brand || 'Sem nome'}</h1>
          {!isNew && <StatusBadge status={draft.status} />}
        </div>
        <div className="page-actions">
          {!isNew && (
            <button className="btn ghost danger" onClick={onDelete}>
              <Icon name="trash" size={16} /> Excluir
            </button>
          )}
          <button className="btn primary" onClick={onSave} disabled={!canSave}>
            <Icon name="check" size={16} /> Salvar
          </button>
        </div>
      </div>

      <Card title="Status">
        <div className="status-stepper">
          {STATUSES.map((s, i) => {
            const cur = STATUSES.findIndex((x) => x.id === draft.status)
            return (
              <button
                key={s.id}
                className={`step ${i < cur ? 'past' : ''} ${i === cur ? 'current' : ''}`}
                onClick={() => set('status', s.id)}
              >
                <span className="step-num">{i < cur ? '✓' : i + 1}</span>
                {s.label}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Marca e contato">
          <div className="form-grid">
            <Field label="Marca *">
              <input value={draft.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Ex.: Glow Cosméticos" autoFocus={isNew} />
            </Field>
            <Field label="Agência">
              <input value={draft.agency} onChange={(e) => set('agency', e.target.value)} placeholder="Direto com a marca" />
            </Field>
            <Field label="E-mail">
              <input type="email" value={draft.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
            </Field>
            <Field label="WhatsApp / telefone">
              <input value={draft.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Valores e pagamento">
          <div className="form-grid">
            <Field label="Valor negociado (R$)">
              <input
                type="number"
                min={0}
                step={50}
                value={draft.value || ''}
                onChange={(e) => set('value', Number(e.target.value))}
                placeholder="0,00"
              />
            </Field>
            <Field label="Forma de pagamento">
              <select value={draft.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as Campaign['paymentMethod'])}>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vencimento do pagamento">
              <input type="date" value={draft.paymentDueDate} onChange={(e) => set('paymentDueDate', e.target.value)} />
            </Field>
            {draft.status === 'paga' && (
              <Field label="Recebido em">
                <input type="date" value={draft.paidAt} onChange={(e) => set('paidAt', e.target.value)} />
              </Field>
            )}
          </div>
        </Card>
      </div>

      <Card
        title="Entregáveis e prazos"
        action={
          <button className="btn small" onClick={() => set('deliverables', [...draft.deliverables, emptyDeliverable()])}>
            <Icon name="plus" size={14} /> Adicionar
          </button>
        }
      >
        {draft.deliverables.length === 0 ? (
          <Empty>Adicione o que foi combinado: ex. 1 Reels + 3 Stories.</Empty>
        ) : (
          <div className="deliverables">
            {draft.deliverables.map((d) => (
              <div key={d.id} className="deliverable">
                <div className="deliverable-what">
                  <input
                    type="number"
                    min={1}
                    className="qty"
                    value={d.quantity}
                    onChange={(e) => setDel(d.id, { quantity: Math.max(1, Number(e.target.value)) })}
                    aria-label="Quantidade"
                  />
                  <select value={d.type} onChange={(e) => setDel(d.id, { type: e.target.value as Deliverable['type'] })} aria-label="Formato">
                    {DELIVERABLE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="grow"
                    placeholder="Observação (ex.: com link na bio)"
                    value={d.description}
                    onChange={(e) => setDel(d.id, { description: e.target.value })}
                  />
                  <button
                    className="icon-btn"
                    aria-label="Remover entregável"
                    onClick={() => set('deliverables', draft.deliverables.filter((x) => x.id !== d.id))}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <div className="deliverable-dates">
                  {(
                    [
                      ['Envio do roteiro', 'scriptDue', 'scriptSent', 'enviado'],
                      ['Aprovação', 'approvalDue', 'approved', 'aprovado'],
                      ['Postagem', 'postDate', 'posted', 'postado'],
                    ] as const
                  ).map(([label, dateKey, doneKey, doneLabel]) => (
                    <div key={dateKey} className={`date-step ${d[doneKey] ? 'done' : ''}`}>
                      <span className="small muted">{label}</span>
                      <input type="date" value={d[dateKey]} onChange={(e) => setDel(d.id, { [dateKey]: e.target.value })} />
                      <label className="check">
                        <input type="checkbox" checked={d[doneKey]} onChange={() => setDel(d.id, { [doneKey]: !d[doneKey] })} />
                        {doneLabel}
                      </label>
                    </div>
                  ))}
                </div>
                <Premium feature="Link do post e métricas" compact>
                  <div className="deliverable-post">
                    <label className="field">
                      <span>Link do post publicado</span>
                      <input
                        value={d.postUrl}
                        placeholder="https://instagram.com/reel/…"
                        onChange={(e) => {
                          const postUrl = e.target.value
                          setDel(d.id, { postUrl, posted: d.posted || isPostUrl(postUrl) })
                        }}
                      />
                    </label>
                    <div className="metrics-inputs">
                      {METRIC_FIELDS.map(([key, label]) => (
                        <label key={key} className="field">
                          <span>{label}</span>
                          <input
                            type="number"
                            min={0}
                            value={d.metrics?.[key] || ''}
                            onChange={(e) => setMetric(d, key, Number(e.target.value))}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </Premium>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid-2">
        <Card title="Briefing">
          <div className="form-grid">
            <Field label="Resumo do briefing" wide>
              <textarea
                rows={6}
                value={draft.briefing}
                onChange={(e) => set('briefing', e.target.value)}
                placeholder="Mensagem-chave, do's & don'ts, hashtags, menções obrigatórias…"
              />
            </Field>
            <Field label="Link do briefing completo" wide>
              <input value={draft.briefingLink} onChange={(e) => set('briefingLink', e.target.value)} placeholder="https://drive…" />
            </Field>
          </div>
        </Card>

        <Card
          title="Cupom e link"
          action={
            (draft.couponCode || draft.couponLink) && (
              <button className="btn small" onClick={copyCoupon}>
                <Icon name="copy" size={14} /> {copied ? 'Copiado!' : 'Copiar'}
              </button>
            )
          }
        >
          <div className="form-grid">
            <Field label="Código do cupom">
              <input
                value={draft.couponCode}
                onChange={(e) => set('couponCode', e.target.value.toUpperCase())}
                placeholder="SEUNOME10"
              />
            </Field>
            <Field label="Desconto">
              <input value={draft.couponDiscount} onChange={(e) => set('couponDiscount', e.target.value)} placeholder="10% / frete grátis" />
            </Field>
            <Field label="Link rastreável" wide>
              <input value={draft.couponLink} onChange={(e) => set('couponLink', e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Anotações" wide>
              <textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Negociação, combinados por áudio, etc." />
            </Field>
          </div>
        </Card>
      </div>

      <Card
        title={
          <span className="row gap">
            <Icon name="sparkle" /> Assistente de briefing <PremiumBadge />
          </span>
        }
        action={
          plan.active && (
            <button className="btn small primary" onClick={runAssistant} disabled={!draft.briefing.trim() && draft.deliverables.length === 0}>
              <Icon name="sparkle" size={14} /> Gerar checklist e roteiro
            </button>
          )
        }
      >
        <Premium
          feature="Assistente de briefing"
          description="Cole o briefing da marca e receba um checklist com prazos, regras do's & don'ts, cupom e um roteiro pronto pra adaptar."
        >
          {draft.checklist.length === 0 && !draft.script ? (
            <Empty>Preencha o briefing e os entregáveis acima e clique em “Gerar checklist e roteiro”.</Empty>
          ) : (
            <div className="grid-2">
              <div>
                <h3>
                  Checklist ({draft.checklist.filter((i) => i.done).length}/{draft.checklist.length})
                </h3>
                <ul className="checklist">
                  {draft.checklist.map((item) => (
                    <li key={item.id} className={item.done ? 'is-done' : ''}>
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          set('checklist', draft.checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
                        }
                      />
                      <span>{item.text}</span>
                      <button
                        className="icon-btn"
                        aria-label="Remover item"
                        onClick={() => set('checklist', draft.checklist.filter((i) => i.id !== item.id))}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="row gap add-item">
                  <input
                    placeholder="Adicionar item…"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  />
                  <button className="btn small" onClick={addChecklistItem}>
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              </div>
              <label className="field">
                <span>Roteiro sugerido (edite à vontade)</span>
                <textarea rows={18} className="script" value={draft.script} onChange={(e) => set('script', e.target.value)} />
              </label>
            </div>
          )}
        </Premium>
      </Card>

      <div className="sticky-save">
        <button className="btn primary" onClick={onSave} disabled={!canSave}>
          <Icon name="check" size={16} /> Salvar campanha
        </button>
      </div>
    </>
  )
}
