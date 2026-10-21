import type { ReactNode } from 'react'
import { useStore } from '../store'
import { Profile } from '../types'
import { Card, Icon, PageHead } from '../components/ui'
import { Premium } from '../components/Premium'
import { MediaKitView } from '../components/MediaKitView'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function MediaKit() {
  const { plan } = useStore()
  return (
    <>
      <PageHead
        title="Mídia kit"
        subtitle="Seus números, preços e cases numa página pronta pra mandar pras marcas."
        actions={
          plan.active && (
            <>
              <a className="btn" href="#/kit" target="_blank" rel="noreferrer">
                <Icon name="external" size={16} /> Abrir página
              </a>
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

function MediaKitEditor() {
  const { profile, updateProfile } = useStore()
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
        <MediaKitView />
      </div>
    </div>
  )
}

/** Página pública (sem o menu do painel). */
export function MediaKitPublic() {
  return (
    <div className="kit-public">
      <Premium feature="Mídia kit">
        <MediaKitView />
        <p className="muted small center no-print">Feito com CreatorPubli</p>
      </Premium>
    </div>
  )
}
