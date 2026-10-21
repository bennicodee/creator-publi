import { useMemo } from 'react'
import { useStore } from '../store'
import { NETWORKS } from '../types'
import { brl } from '../lib/format'
import { campaignResults, compact, pct } from '../lib/metrics'
import { waLink } from '../lib/whatsapp'

/** O mídia kit renderizado, usado na prévia e na página pública. */
export function MediaKitView() {
  const { profile, campaigns } = useStore()
  const cases = useMemo(() => campaignResults(campaigns).slice(0, 6), [campaigns])
  const networks = NETWORKS.filter((n) => profile.networks[n.id].handle || profile.networks[n.id].followers)
  const reach = networks.reduce((a, n) => a + profile.networks[n.id].followers, 0)
  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const prices = [
    ['Reels', profile.priceReels],
    ['Stories (cada)', profile.priceStories],
    ['TikTok', profile.priceTiktok],
  ].filter(([, v]) => Number(v) > 0) as [string, number][]

  return (
    <article className="kit">
      <header className="kit-hero">
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt="" className="kit-photo" />
        ) : (
          <span className="kit-photo kit-initials">{initials || '?'}</span>
        )}
        <div>
          <h1>{profile.name || 'Seu nome'}</h1>
          <p className="kit-niche">{[profile.niche, profile.city].filter(Boolean).join(' · ')}</p>
          {profile.bio && <p className="kit-bio">{profile.bio}</p>}
        </div>
      </header>

      {networks.length > 0 && (
        <section className="kit-section">
          <h2>Audiência</h2>
          <div className="kit-stats">
            <div className="kit-stat highlight">
              <strong>{compact(reach)}</strong>
              <span>seguidores no total</span>
            </div>
            {networks.map((n) => {
              const acc = profile.networks[n.id]
              return (
                <div key={n.id} className="kit-stat">
                  <strong>{compact(acc.followers)}</strong>
                  <span>
                    {n.label} {acc.handle}
                  </span>
                  {acc.engagement > 0 && <em>{pct(acc.engagement)} de engajamento</em>}
                </div>
              )
            })}
          </div>
          {(profile.audienceFemale > 0 || profile.audienceAge || profile.audienceCities) && (
            <ul className="kit-audience">
              {profile.audienceFemale > 0 && <li>{profile.audienceFemale}% mulheres</li>}
              {profile.audienceAge && <li>{profile.audienceAge}</li>}
              {profile.audienceCities && <li>Top cidades: {profile.audienceCities}</li>}
            </ul>
          )}
        </section>
      )}

      {profile.showCases && cases.length > 0 && (
        <section className="kit-section">
          <h2>Marcas que confiaram</h2>
          <div className="kit-cases">
            {cases.map((r) => (
              <div key={r.campaign.id} className="kit-case">
                <strong>{r.campaign.brand}</strong>
                <span>{compact(r.metrics.views)} views</span>
                <span>{pct(r.engagement)} engajamento</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {prices.length > 0 && (
        <section className="kit-section">
          <h2>Formatos e investimento</h2>
          <ul className="kit-prices">
            {prices.map(([label, value]) => (
              <li key={label}>
                <span>{label}</span>
                <strong>a partir de {brl(value)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="kit-footer">
        <span>Vamos fazer uma parceria?</span>
        <div className="row gap">
          {profile.contactEmail && (
            <a className="btn primary" href={`mailto:${profile.contactEmail}`}>
              {profile.contactEmail}
            </a>
          )}
          {profile.contactPhone && (
            <a className="btn" href={waLink(profile.contactPhone, `Oi ${profile.name}! Vi seu mídia kit e quero falar sobre uma parceria.`)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
        </div>
      </footer>
    </article>
  )
}
