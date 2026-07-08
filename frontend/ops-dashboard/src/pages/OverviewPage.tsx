import { useEffect, useState, useCallback } from 'react'
import type { IncidentQueue, HeatmapData, HealthStatus } from '../types'

const API = '/api'
const REFRESH = 30_000

function StatCard({ label, value, color, delta, deltaDir }: {
  label: string; value: string | number; color?: string
  delta?: string; deltaDir?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="stat-card" role="figure" aria-label={`${label}: ${value}`}>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {delta && <div className={`stat-delta ${deltaDir ?? 'neutral'}`}>{delta}</div>}
    </div>
  )
}

function ServiceStatus({ name, status }: { name: string; status: string }) {
  const color = status === 'healthy' ? 'var(--accent-green)' :
    status === 'degraded' ? 'var(--accent-orange)' : 'var(--accent-red)'
  return (
    <div className="flex items-center justify-between" style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.7rem' }}>
      <span className="text-muted">{name}</span>
      <span style={{ color, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{status}</span>
    </div>
  )
}

export default function OverviewPage() {
  const [incidents, setIncidents] = useState<IncidentQueue | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [inc, hm, h] = await Promise.allSettled([
        fetch(`${API}/incidents/queue`).then(r => r.json()),
        fetch(`${API}/crowd-heatmap`).then(r => r.json()),
        fetch(`${API}/health`).then(r => r.json()),
      ])
      if (inc.status === 'fulfilled') setIncidents(inc.value)
      if (hm.status === 'fulfilled') setHeatmap(hm.value)
      if (h.status === 'fulfilled') setHealth(h.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, REFRESH)
    return () => clearInterval(id)
  }, [fetchAll])

  const summary = incidents?.summary
  const stats = heatmap?.stadium_level_stats
  const totalIncidents = (summary?.critical_count ?? 0) + (summary?.high_count ?? 0) +
    (summary?.medium_count ?? 0) + (summary?.low_count ?? 0)

  return (
    <section aria-labelledby="overview-title" className="fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }} id="overview-title">
          📊 Command Overview
        </h1>
        <button className="btn-ops btn-ops-ghost btn-ops-sm" onClick={fetchAll} aria-label="Refresh all data" id="overview-refresh-btn">
          ↻ Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid-4" role="list" aria-label="Key performance indicators">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-dark" style={{ height: 90 }} />
          ))
        ) : (
          <>
            <div role="listitem">
              <StatCard
                label="Occupancy" value={stats ? `${Math.round(stats.occupancy_percent)}%` : '78%'}
                color={stats && stats.occupancy_percent > 85 ? 'var(--accent-red)' : 'var(--accent-orange)'}
                delta="+2.1%/min" deltaDir="up"
              />
            </div>
            <div role="listitem">
              <StatCard
                label="Active Incidents" value={totalIncidents}
                color={summary && summary.critical_count > 0 ? 'var(--accent-red)' : 'var(--accent-gold)'}
                delta={summary ? `${summary.critical_count} critical` : ''}
                deltaDir={summary && summary.critical_count > 0 ? 'up' : 'neutral'}
              />
            </div>
            <div role="listitem">
              <StatCard
                label="Fan Sessions" value="8,342" color="var(--accent-green)"
                delta="+284 last 5min" deltaDir="up"
              />
            </div>
            <div role="listitem">
              <StatCard
                label="Uptime" value={health ? `${Math.floor(health.uptime_seconds / 60)}m` : '—'}
                color="var(--accent-blue)"
                delta={health ? `${health.request_count_last_hour} reqs` : ''} deltaDir="neutral"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        {/* Incident Summary */}
        <div className="panel" aria-labelledby="inc-summary-title">
          <div className="panel-title">
            <span id="inc-summary-title">🚨 Incident Summary</span>
          </div>
          {summary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Critical', count: summary.critical_count, cls: 'sev-critical' },
                { label: 'High', count: summary.high_count, cls: 'sev-high' },
                { label: 'Medium', count: summary.medium_count, cls: 'sev-medium' },
                { label: 'Low', count: summary.low_count, cls: 'sev-low' },
              ].map(({ label, count, cls }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className={`sev-badge ${cls}`}>{label}</span>
                  <span className="mono font-bold" style={{ fontSize: '1rem' }}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="skeleton-dark" style={{ height: 100 }} />
          )}
        </div>

        {/* Service Health */}
        <div className="panel" aria-labelledby="svc-health-title">
          <div className="panel-title">
            <span id="svc-health-title">💚 Service Health</span>
            <span className="text-xs mono" style={{ color: health?.status === 'healthy' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {health?.status ?? '…'}
            </span>
          </div>
          {health ? (
            <div>
              {Object.entries(health.services).map(([svc, status]) => (
                <ServiceStatus key={svc} name={svc.replace('_', ' ')} status={status} />
              ))}
              <div className="flex justify-between" style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span>Mode: {health.mode}</span>
                <span>Uptime: {Math.floor(health.uptime_seconds / 60)} min</span>
              </div>
            </div>
          ) : (
            <div className="skeleton-dark" style={{ height: 100 }} />
          )}
        </div>
      </div>

      {/* Hottest zones */}
      {heatmap && (
        <div className="panel" style={{ marginTop: '1rem' }} aria-labelledby="zone-overview-title">
          <div className="panel-title">
            <span id="zone-overview-title">📍 Zone Status</span>
            <span className="text-xs text-muted">{new Date().toLocaleTimeString()} UTC</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {heatmap.stadium_zones.slice(0, 4).map(zone => {
              const color = { green: 'var(--accent-green)', yellow: 'var(--accent-gold)', orange: 'var(--accent-orange)', red: 'var(--accent-red)' }[zone.color_coding]
              return (
                <div key={zone.zone_id}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: '0.7rem' }}>{zone.zone_name}</span>
                    <span style={{ fontSize: '0.7rem', color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {Math.round(zone.occupancy_percent)}%
                    </span>
                  </div>
                  <div className="occ-bar-wrap">
                    <div className="occ-bar" style={{ width: `${zone.occupancy_percent}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
