import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../store'
import { Profile } from '../types'
import { Card, Icon, PageHead } from '../components/ui'
import { Premium } from '../components/Premium'
import { MediaKitView } from '../components/MediaKitView'
import { campaignResults } from '../lib/metrics'
import { api, type PublicKit } from '../lib/api'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function MediaKit() {
  const { plan, profile } = useStore()
  return (
    <>
      <PageHead
        title="Mídia kit"
        subtitle="Seus números, preços e cases numa página pronta pra mandar pras marcas."
        actions={
          plan.active && (
            <>
              {profile.publicSlug && (
                <a className="btn" href={`#/kit/${profile.publicSlug}`} target="_blank" rel="noreferrer">
                  <Icon name="external" size={16} /> Abrir página
                </a>
              )}
              <button className="btn primary" onClick={() => window.print()}>
                <Icon name="print" size={16} /> Salvar PDF
              </button>
            </>
          )
        }
      />
      <Premium
        feature="Mídia kit"
        description="Monte seu mídia kit com seguidores, engajamento, audiência, preços e os resultados reais das suas publis — e exporte em PDF."
      >
        <MediaKitEditor />
      </Premium>
    </>
  )
}

/** "Ana Lima" -> "ana-lima": só letras minúsculas, números e hífen, como a API aceita. */
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60)

function MediaKitEditor() {
  const { profile, updateProfile, campaigns } = useStore()
  const cases = useMemo(
    () =>
      campaignResults(campaigns)
        .slice(0, 6)
        .map((r) => ({ brand: r.campaign.brand, views: r.metrics.views, engagement: r.engagement })),
    [campaigns],
  )
  const publicUrl = `${window.location.origin}${window.location.pathname}#/kit/${profile.publicSlug}`
  const text = (k: keyof Profile) => ({
    value: String(profile[k] ?? ''),
    onChange: (e: { target: { value: string } }) => updateProfile({ [k]: e.target.value }),
  })
  const num = (k: keyof Profile) => ({
    type: 'number',
    min: 0,
    value: Number(profile[k]) || '',
    onChange: (e: { target: { value: string } }) => updateProfile({ [k]: Number(e.target.value) }),
  })

  return (
    <div className="kit-layout kit-print">
      <div className="stack no-print">
        <Card title="Página pública">
          <Field label="Endereço do seu mídia kit">
            <input
              value={profile.publicSlug}
              placeholder={slugify(profile.name) || 'seu-nome'}
              onChange={(e) => updateProfile({ publicSlug: slugify(e.target.value) })}
              onBlur={() => updateProfile({ publicSlug: profile.publicSlug.replace(/-+$/, '') })}
            />
          </Field>
          <p className="muted small note">
            {profile.publicSlug ? (
              <>
                Link para mandar às marcas:{' '}
                <a href={`#/kit/${profile.publicSlug}`} target="_blank" rel="noreferrer" className="link">
                  {publicUrl}
                </a>
              </>
            ) : (
              'Escolha um endereço para ter um link do mídia kit que você pode mandar pras marcas.'
            )}
          </p>
        </Card>
        <Card title="Sobre você">
          <div className="form-grid">
            <Field label="Nome">
              <input {...text('name')} />
            </Field>
            <Field label="Nicho">
              <input {...text('niche')} placeholder="Beleza · Lifestyle" />
            </Field>
            <Field label="Cidade">
              <input {...text('city')} />
            </Field>
            <Field label="Foto (URL)">
              <input {...text('photoUrl')} placeholder="https://…" />
            </Field>
            <Field label="Bio" wide>
              <textarea rows={3} {...text('bio')} />
            </Field>
            <Field label="E-mail comercial">
              <input type="email" {...text('contactEmail')} />
            </Field>
            <Field label="WhatsApp comercial">
              <input {...text('contactPhone')} />
            </Field>
          </div>
        </Card>
        <Card title="Audiência">
          <div className="form-grid">
            <Field label="% mulheres">
              <input {...num('audienceFemale')} max={100} />
            </Field>
            <Field label="Faixa etária principal">
              <input {...text('audienceAge')} placeholder="18–34 anos (71%)" />
            </Field>
            <Field label="Top cidades" wide>
              <input {...text('audienceCities')} />
            </Field>
          </div>
          <p className="muted small note">
            Seguidores e engajamento vêm de <a href="#/metricas" className="link">Métricas</a>.
          </p>
        </Card>
        <Card title="Preços de referência">
          <div className="form-grid">
            <Field label="Reels (R$)">
              <input {...num('priceReels')} step={50} />
            </Field>
            <Field label="Story (R$)">
              <input {...num('priceStories')} step={50} />
            </Field>
            <Field label="TikTok (R$)">
              <input {...num('priceTiktok')} step={50} />
            </Field>
          </div>
          <label className="check note">
            <input type="checkbox" checked={profile.showCases} onChange={(e) => updateProfile({ showCases: e.target.checked })} />
            Mostrar cases (campanhas com métricas)
          </label>
        </Card>
      </div>
      <div className="kit-preview">
        <MediaKitView profile={profile} cases={cases} />
      </div>
    </div>
  )
}

/** Página pública (sem login e sem o menu do painel), lida da API pelo endereço. */
export function MediaKitPublic({ slug }: { slug: string }) {
  const [kit, setKit] = useState<PublicKit | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setKit(null)
    setError('')
    api
      .publicKit(slug)
      .then((k) => alive && setKit(k))
      .catch((e: { status?: number; message: string }) =>
        alive && setError(e.status === 404 ? 'Esse mídia kit não existe ou não está publicado.' : e.message),
      )
    return () => {
      alive = false
    }
  }, [slug])

  return (
    <div className="kit-public">
      {kit ? (
        <>
          <MediaKitView profile={kit.profile} cases={kit.cases} />
          <p className="muted small center no-print">Feito com CreatorPubli</p>
        </>
      ) : (
        <p className="empty">{error || 'Carregando…'}</p>
      )}
    </div>
  )
}
