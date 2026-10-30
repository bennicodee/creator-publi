import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { NETWORKS, Network, isClosed } from '../types'
import { brl, fmtDate, todayISO } from '../lib/format'
import { deliverableLabel } from '../lib/schedule'
import { campaignResults, compact, engagementRate, interactions, pct, sumMetrics } from '../lib/metrics'
import { Card, Empty, Icon, Kpi, PageHead } from '../components/ui'
import { Premium } from '../components/Premium'

export function Metrics() {
  return (
    <>
      <PageHead title="Métricas" subtitle="Confirme suas postagens e acompanhe o resultado de cada publi." />
      <Premium
        feature="Métricas dos posts"
        description="Confirme cada postagem pelo link, registre views e engajamento e veja o custo por mil views de cada marca — o argumento perfeito pra renegociar."
      >
        <MetricsContent />
      </Premium>
    </>
  )
}

function MetricsContent() {
  const { campaigns, profile, updateProfile, patchDeliverable } = useStore()
  const today = todayISO()
  const [urls, setUrls] = useState<Record<string, string>>({})

  const posts = useMemo(
    () =>
      campaigns
        .filter((c) => isClosed(c.status))
        .flatMap((c) => c.deliverables.filter((d) => d.postDate && d.postDate <= today).map((d) => ({ c, d })))
        .sort((a, b) => b.d.postDate.localeCompare(a.d.postDate)),
    [campaigns, today],
  )
  const results = useMemo(() => campaignResults(campaigns), [campaigns])
  const total = sumMetrics(results.map((r) => r.metrics))
  const unconfirmed = posts.filter(({ d }) => !d.postUrl)

  const setNetwork = (n: Network, patch: Partial<(typeof profile.networks)[Network]>) =>
    updateProfile({ networks: { ...profile.networks, [n]: { ...profile.networks[n], ...patch } } })

  const confirmPost = (campaignId: string, deliverableId: string, key: string) => {
    const postUrl = urls[key]?.trim()
    if (!postUrl) return
    patchDeliverable(campaignId, deliverableId, { postUrl, posted: true })
    setUrls((u) => ({ ...u, [key]: '' }))
  }

  return (
    <>
      <div className="kpis">
        <Kpi label="Views em publis" value={compact(total.views)} />
        <Kpi label="Interações" value={compact(interactions(total))} />
        <Kpi label="Engajamento médio" value={pct(engagementRate(total))} tone="good" />
        <Kpi
          label="Posts sem confirmação"
          value={String(unconfirmed.length)}
          tone={unconfirmed.length > 0 ? 'bad' : undefined}
          hint="cole o link pra confirmar"
        />
      </div>

      <Card title="Suas contas">
        <div className="network-grid">
          {NETWORKS.map((n) => {
            const acc = profile.networks[n.id]
            return (
              <div key={n.id} className="network-card">
                <strong>{n.label}</strong>
                <label className="field">
                  <span>Perfil</span>
                  <input value={acc.handle} placeholder="@seuperfil" onChange={(e) => setNetwork(n.id, { handle: e.target.value })} />
                </label>
                <div className="row gap nowrap">
                  <label className="field">
                    <span>Seguidores</span>
                    <input type="number" min={0} value={acc.followers || ''} onChange={(e) => setNetwork(n.id, { followers: Number(e.target.value) })} />
                  </label>
                  <label className="field">
                    <span>Engaj. %</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={acc.engagement || ''}
                      onChange={(e) => setNetwork(n.id, { engagement: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        <p className="muted small note">
          A busca automática dos números no Instagram e no TikTok vem em breve. Por enquanto, atualize os números aqui —
          eles alimentam o seu mídia kit.
        </p>
      </Card>

      <Card title="Postagens">
        {posts.length === 0 ? (
          <Empty>Nenhuma postagem com data passada ainda.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Data</th>
                  <th>Confirmação</th>
                  <th className="num">Views</th>
                  <th className="num">Engaj.</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(({ c, d }) => {
                  const key = `${c.id}:${d.id}`
                  return (
                    <tr key={key} className={!d.postUrl ? 'row-late' : ''}>
                      <td>
                        <a href={`#/campanhas/${c.id}`}>
                          <strong>{c.brand}</strong>
                        </a>
                        <div className="muted small">{deliverableLabel(d)}</div>
                      </td>
                      <td className="small">{fmtDate(d.postDate)}</td>
                      <td>
                        {d.postUrl ? (
                          <a href={d.postUrl} target="_blank" rel="noreferrer" className="confirmed small">
                            <Icon name="check" size={14} /> Confirmado <Icon name="external" size={12} />
                          </a>
                        ) : (
                          <div className="row gap nowrap">
                            <input
                              className="input-small"
                              placeholder="Cole o link do post"
                              value={urls[key] ?? ''}
                              onChange={(e) => setUrls((u) => ({ ...u, [key]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && confirmPost(c.id, d.id, key)}
                            />
                            <button className="btn small" onClick={() => confirmPost(c.id, d.id, key)}>
                              OK
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="num">{d.metrics ? compact(d.metrics.views) : <a href={`#/campanhas/${c.id}`} className="link">preencher</a>}</td>
                      <td className="num">{d.metrics ? pct(engagementRate(d.metrics)) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Resultado por campanha">
        {results.length === 0 ? (
          <Empty>Preencha as métricas dos posts (na tela da campanha) para ver o resultado aqui.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Marca</th>
                  <th className="num">Posts</th>
                  <th className="num">Views</th>
                  <th className="num">Engaj.</th>
                  <th className="num">Valor</th>
                  <th className="num" title="Quanto a marca pagou por mil visualizações">CPM</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.campaign.id}>
                    <td>
                      <a href={`#/campanhas/${r.campaign.id}`}>
                        <strong>{r.campaign.brand}</strong>
                      </a>
                    </td>
                    <td className="num">{r.posts}</td>
                    <td className="num">{compact(r.metrics.views)}</td>
                    <td className="num">{pct(r.engagement)}</td>
                    <td className="num">{brl(r.campaign.value)}</td>
                    <td className="num">{brl(r.cpm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
