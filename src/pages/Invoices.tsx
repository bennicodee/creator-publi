import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { Campaign, Invoice, isClosed } from '../types'
import { brl, fmtDate, todayISO } from '../lib/format'
import { deliverableLabel } from '../lib/schedule'
import { Card, Empty, Icon, Kpi, PageHead, StatusBadge } from '../components/ui'
import { Premium } from '../components/Premium'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

/** Rascunho de NF pré-preenchido com os dados da campanha. */
function draftInvoice(c: Campaign, issRate: number): Invoice {
  const items = c.deliverables.map(deliverableLabel).join(', ')
  return {
    status: 'rascunho',
    number: '',
    issuedAt: '',
    takerName: c.agency || c.brand,
    takerDoc: '',
    takerEmail: c.contactEmail,
    takerAddress: '',
    description: `Serviços de publicidade e divulgação em redes sociais — campanha ${c.brand}${items ? ` (${items})` : ''}.`,
    issRate,
  }
}

export function Invoices() {
  return (
    <>
      <PageHead title="Notas fiscais" subtitle="NF pré-preenchida a partir de cada campanha, sem redigitar nada." />
      <Premium
        feature="Emissão de nota fiscal"
        description="Gere a NF de cada campanha com tomador, descrição do serviço, valor e ISS já preenchidos, e controle o que já foi emitido."
      >
        <InvoicesContent />
      </Premium>
    </>
  )
}

function InvoicesContent() {
  const { campaigns, profile, updateProfile, patchCampaign } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Invoice | null>(null)

  const billable = campaigns.filter((c) => isClosed(c.status))
  const issued = billable.filter((c) => c.invoice?.status === 'emitida')
  const missing = billable.filter((c) => c.invoice?.status !== 'emitida')
  const selected = campaigns.find((c) => c.id === selectedId)

  const open = (c: Campaign) => {
    setSelectedId(c.id)
    setDraft(c.invoice ?? draftInvoice(c, profile.defaultIssRate))
  }
  const close = () => {
    setSelectedId(null)
    setDraft(null)
  }
  const persist = (inv: Invoice) => {
    if (selected) patchCampaign(selected.id, { invoice: inv })
  }
  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  return (
    <>
      <div className="kpis">
        <Kpi label="NFs emitidas" value={String(issued.length)} tone="good" hint={brl(issued.reduce((a, c) => a + c.value, 0))} />
        <Kpi
          label="Sem nota"
          value={String(missing.length)}
          tone={missing.some((c) => c.status === 'paga') ? 'bad' : undefined}
          hint={brl(missing.reduce((a, c) => a + c.value, 0))}
        />
      </div>

      <Card title="Seus dados fiscais">
        <div className="form-grid four">
          <Field label="CNPJ (MEI)">
            <input value={profile.cnpj} placeholder="00.000.000/0001-00" onChange={(e) => updateProfile({ cnpj: e.target.value })} />
          </Field>
          <Field label="Razão social">
            <input value={profile.legalName} onChange={(e) => updateProfile({ legalName: e.target.value })} />
          </Field>
          <Field label="Município">
            <input value={profile.municipality} onChange={(e) => updateProfile({ municipality: e.target.value })} />
          </Field>
          <Field label="ISS padrão (%)">
            <input
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={profile.defaultIssRate}
              onChange={(e) => updateProfile({ defaultIssRate: Number(e.target.value) })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Campanhas">
        {billable.length === 0 ? (
          <Empty>Nenhuma campanha fechada ainda.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Marca</th>
                  <th>Status</th>
                  <th>Nota</th>
                  <th className="num">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {billable.map((c) => (
                  <tr key={c.id} className={c.status === 'paga' && c.invoice?.status !== 'emitida' ? 'row-late' : ''}>
                    <td>
                      <strong>{c.brand}</strong>
                      {c.agency && <div className="muted small">via {c.agency}</div>}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="small">
                      {c.invoice?.status === 'emitida' ? (
                        <span className="confirmed">
                          <Icon name="check" size={14} /> Nº {c.invoice.number || '—'} · {fmtDate(c.invoice.issuedAt)}
                        </span>
                      ) : c.invoice ? (
                        'Rascunho'
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">{brl(c.value)}</td>
                    <td className="row-actions">
                      <button className="btn small" onClick={() => open(c)}>
                        <Icon name="invoice" size={14} /> {c.invoice ? 'Abrir' : 'Preparar NF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && draft && (
        <Card
          title={`NF · ${selected.brand}`}
          action={
            <button className="icon-btn" onClick={close} aria-label="Fechar">
              ✕
            </button>
          }
        >
          <div className="form-grid">
            <Field label="Tomador (razão social)">
              <input value={draft.takerName} onChange={(e) => set('takerName', e.target.value)} />
            </Field>
            <Field label="CNPJ do tomador">
              <input value={draft.takerDoc} onChange={(e) => set('takerDoc', e.target.value)} />
            </Field>
            <Field label="E-mail do tomador">
              <input value={draft.takerEmail} onChange={(e) => set('takerEmail', e.target.value)} />
            </Field>
            <Field label="Endereço do tomador">
              <input value={draft.takerAddress} onChange={(e) => set('takerAddress', e.target.value)} />
            </Field>
            <Field label="Discriminação do serviço" wide>
              <textarea rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label="Valor do serviço">
              <input value={brl(selected.value)} disabled />
            </Field>
            <Field label={`ISS (${draft.issRate}%)`}>
              <input
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={draft.issRate}
                onChange={(e) => set('issRate', Number(e.target.value))}
              />
            </Field>
            <Field label="Número da NF">
              <input value={draft.number} onChange={(e) => set('number', e.target.value)} placeholder="após emitir na prefeitura" />
            </Field>
            <Field label="Data de emissão">
              <input type="date" value={draft.issuedAt} onChange={(e) => set('issuedAt', e.target.value)} />
            </Field>
          </div>
          <div className="row gap invoice-actions">
            <button className="btn" onClick={() => persist(draft)}>
              Salvar rascunho
            </button>
            <button className="btn" onClick={() => window.print()}>
              <Icon name="print" size={16} /> Imprimir espelho
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const inv: Invoice = { ...draft, status: 'emitida', issuedAt: draft.issuedAt || todayISO() }
                persist(inv)
                close()
              }}
            >
              <Icon name="check" size={16} /> Marcar como emitida
            </button>
          </div>
          <p className="muted small note">
            Nesta versão a NF não é transmitida à prefeitura: use estes dados no emissor (ex.: Emissor Nacional do MEI) e registre aqui o
            número.
          </p>
          <InvoiceSheet campaign={selected} invoice={draft} />
        </Card>
      )}
    </>
  )
}

/** Espelho da NF, visível só na impressão. */
function InvoiceSheet({ campaign, invoice }: { campaign: Campaign; invoice: Invoice }) {
  const { profile } = useStore()
  const iss = (campaign.value * invoice.issRate) / 100
  // Portal no body para a impressão esconder o painel inteiro e mostrar só o espelho.
  return createPortal(
    <div className="print-only invoice-sheet">
      <h1>Espelho de Nota Fiscal de Serviço</h1>
      <section>
        <h2>Prestador</h2>
        <p>
          {profile.legalName || profile.name} · CNPJ {profile.cnpj || '—'} · {profile.municipality}
        </p>
      </section>
      <section>
        <h2>Tomador</h2>
        <p>
          {invoice.takerName} · CNPJ {invoice.takerDoc || '—'}
          <br />
          {invoice.takerAddress} {invoice.takerEmail && `· ${invoice.takerEmail}`}
        </p>
      </section>
      <section>
        <h2>Discriminação</h2>
        <p>{invoice.description}</p>
      </section>
      <table>
        <tbody>
          <tr>
            <td>Valor do serviço</td>
            <td>{brl(campaign.value)}</td>
          </tr>
          <tr>
            <td>ISS ({invoice.issRate}%)</td>
            <td>{brl(iss)}</td>
          </tr>
          <tr>
            <td>Número / emissão</td>
            <td>
              {invoice.number || '—'} · {invoice.issuedAt ? fmtDate(invoice.issuedAt) : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>,
    document.body,
  )
}
