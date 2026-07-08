import { useEffect, useState, useCallback } from 'react'
import type { HeatmapData, HeatmapZone } from '../types'

const API = '/api'
const POLL_INTERVAL = 20_000

const COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
}

function ZoneRow({ zone }: { zone: HeatmapZone }) {
  const color = COLOR_MAP[zone.color_coding] ?? '#22c55e'
  return (
    <div
      className="log-entry"
      style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px 70px 120px', alignItems: 'center', gap: '0.75rem' }}
      role="row"
      aria-label={`${zone.zone_name}: ${Math.round(zone.occupancy_percent)}%`}
    >
      <div style={{ fontWeight: 600, fontSize: '0.7rem' }}>{zone.zone_name}</div>
      <div>
        <div className="occ-bar-wrap">
          <div className="occ-bar" style={{ width: `${zone.occupancy_percent}%`, background: color }} />
        </div>
      </div>
      <div className="mono" style={{ color, fontWeight: 700, fontSize: '0.75rem', textAlign: 'right' }}>
        {Math.round(zone.occupancy_percent)}%
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        {zone.current_occupancy.toLocaleString()}
      </div>
      <div style={{
        fontSize: '0.65rem', color,
        background: color + '18', padding: '2px 6px', borderRadius: 3,
        textAlign: 'center', maxWidth: 120,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {zone.trend} {zone.trend_rate !== 'stable' ? `(${zone.trend_rate})` : ''}
      </div>
    </div>
  )
}

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${API}/crowd-heatmap`)
      if (!res.ok) throw new Error()
      setData(await res.json())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetch_])

  const stats = data?.stadium_level_stats
  const zones = data?.stadium_zones ?? []
  const sortedZones = [...zones].sort((a, b) => b.occupancy_percent - a.occupancy_percent)

  const criticalZones = zones.filter(z => z.color_coding === 'red').length
  const highZones = zones.filter(z => z.color_coding === 'orange').length

  return (
    <section className="fade-in" aria-labelledby="heatmap-title">
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }} id="heatmap-title">
          🗺️ Crowd Heatmap
        </h1>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted">Auto-refresh 20s</span>
          <button className="btn-ops btn-ops-ghost btn-ops-sm" onClick={fetch_} id="refresh-heatmap-btn">↻</button>
        </div>
      </div>

      {/* Stadium-level stats */}
      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        {[
          { label: 'Total Capacity', value: stats?.total_capacity.toLocaleString() ?? '80,000', color: 'var(--text-primary)' },
          { label: 'Current Fans', value: stats?.current_occupancy.toLocaleString() ?? '—', color: 'var(--accent-blue)' },
          { label: 'Occupancy', value: stats ? `${Math.round(stats.occupancy_percent)}%` : '—', color: stats && stats.occupancy_percent > 85 ? 'var(--accent-red)' : 'var(--accent-orange)' },
          { label: 'Arrival Rate', value: stats ? `${stats.estimated_arrival_rate}/min` : '—', color: 'var(--accent-green)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-value" style={{ color, fontSize: '1.5rem' }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Alert bar */}
      {(criticalZones > 0 || highZones > 0) && (
        <div role="alert" style={{
          background: criticalZones > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
          border: `1px solid ${criticalZones > 0 ? 'var(--accent-red)' : 'var(--accent-orange)'}`,
          borderRadius: 8, padding: '0.75rem', marginBottom: '1rem',
          fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{criticalZones > 0 ? '🚨' : '⚠️'}</span>
          <span>
            {criticalZones > 0 && `${criticalZones} zone(s) CRITICAL (>93%). `}
            {highZones > 0 && `${highZones} zone(s) HIGH (85-93%). `}
            Consider broadcasting reroute.
          </span>
        </div>
      )}

      {/* Zone table */}
      <div className="panel">
        <div className="panel-title">
          Zone-by-Zone Occupancy
          <div className="flex gap-3">
            {[
              { color: '#22c55e', label: '<70%' },
              { color: '#f59e0b', label: '70-85%' },
              { color: '#f97316', label: '85-93%' },
              { color: '#ef4444', label: '>93%' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px 70px 120px', gap: '0.75rem', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }} role="row">
          <div>Zone</div>
          <div>Occupancy</div>
          <div style={{ textAlign: 'right' }}>%</div>
          <div style={{ textAlign: 'right' }}>Fans</div>
          <div style={{ textAlign: 'center' }}>Trend</div>
        </div>

        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="log-entry" style={{ gap: 8 }}>
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="skeleton-dark" style={{ height: 12, flex: 1 }} />
            ))}
          </div>
        ))}

        {error && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            ⚠️ Failed to load heatmap.
            <button className="btn-ops btn-ops-ghost btn-ops-sm" onClick={fetch_} style={{ marginLeft: 8 }} id="retry-heatmap-btn">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div role="table" aria-label="Zone occupancy">
            {sortedZones.map(zone => <ZoneRow key={zone.zone_id} zone={zone} />)}
          </div>
        )}
      </div>

      {/* Zone recommendations */}
      {!loading && !error && zones.some(z => z.recommendation) && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <div className="panel-title">AI Recommendations</div>
          {sortedZones.filter(z => z.color_coding === 'red' || z.color_coding === 'orange').map(zone => {
            const color = COLOR_MAP[zone.color_coding]
            return (
              <div key={zone.zone_id} className="log-entry" style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color, width: 100, flexShrink: 0 }}>{zone.zone_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>{zone.recommendation}</span>
              </div>
            )
          })}
        </div>
      )}

      {data && (
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
          Last updated: {new Date(data.timestamp).toLocaleTimeString()} · Next refresh in 20s
        </div>
      )}
    </section>
  )
}
