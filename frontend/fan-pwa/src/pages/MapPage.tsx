import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { HeatmapData, ZoneData } from '../types'

const API_BASE = '/api'
const POLL_INTERVAL = 30_000  // 30 seconds

const COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
}

interface ZoneCardProps {
  zone: ZoneData
  isSelected: boolean
  onClick: () => void
}

function ZoneCard({ zone, isSelected, onClick }: ZoneCardProps) {
  const { t } = useTranslation()
  const color = COLOR_MAP[zone.color_coding] ?? '#22c55e'
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${zone.zone_name}: ${Math.round(zone.occupancy_percent)}% occupancy`}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        background: 'var(--color-surface-2)',
        border: `2px solid ${isSelected ? color : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
          {zone.zone_name}
        </span>
        <span style={{
          fontSize: 'var(--font-size-xs)', fontWeight: 700, color,
          background: color + '22', padding: '2px 8px', borderRadius: 'var(--radius-full)',
        }}>
          {Math.round(zone.occupancy_percent)}%
        </span>
      </div>
      {/* Mini progress bar */}
      <div style={{ height: 4, background: 'var(--color-surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${zone.occupancy_percent}%`,
          background: color, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease',
        }} />
      </div>
      {isSelected && (
        <div style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          <div><strong>{t('map.trend')}:</strong> {zone.trend} ({zone.trend_rate})</div>
          <div style={{ marginTop: 4, color: color }}><strong>{t('map.recommendation')}:</strong> {zone.recommendation}</div>
        </div>
      )}
    </div>
  )
}

export default function MapPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchHeatmap = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/crowd-heatmap`)
      if (!res.ok) throw new Error()
      const json: HeatmapData = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHeatmap()
    const id = setInterval(fetchHeatmap, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchHeatmap])

  const stats = data?.stadium_level_stats

  return (
    <section aria-labelledby="map-title">
      <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
        <h1 className="card-title" id="map-title" style={{ marginBottom: 0 }}>
          <span aria-hidden="true">📡</span> {t('map.title')}
        </h1>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchHeatmap}
          aria-label="Refresh heatmap"
          id="refresh-heatmap-btn"
        >↻</button>
      </div>
      <p className="text-xs text-muted" style={{ marginBottom: '1rem' }}>
        {lastUpdated ? `${t('map.lastUpdated')}: ${lastUpdated.toLocaleTimeString()}` : t('map.loading')}
      </p>

      {/* Stadium-level stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { label: t('map.totalCapacity'), value: stats.total_capacity.toLocaleString(), icon: '🏟️' },
            { label: t('map.currentOccupancy'), value: `${Math.round(stats.occupancy_percent)}%`, icon: '👥' },
            { label: t('map.arrivalRate'), value: `${stats.estimated_arrival_rate} ${t('map.fansPerMin')}`, icon: '⬆️' },
            { label: t('map.etaFull'), value: stats.eta_to_full_capacity, icon: '⏱️' },
          ].map(item => (
            <div key={item.label} className="transit-card">
              <div style={{ fontSize: '1.25rem', marginBottom: 2 }}>{item.icon}</div>
              <div className="text-xs text-muted">{item.label}</div>
              <div className="font-bold text-sm">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="map-legend" role="list" aria-label="Occupancy legend">
        {[
          { key: 'low', color: '#22c55e', label: t('map.low') },
          { key: 'moderate', color: '#f59e0b', label: t('map.moderate') },
          { key: 'high', color: '#f97316', label: t('map.high') },
          { key: 'critical', color: '#ef4444', label: t('map.critical') },
        ].map(item => (
          <div key={item.key} className="legend-item" role="listitem">
            <div className="legend-dot" style={{ background: item.color }} aria-hidden="true" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Zone cards */}
      {loading && (
        <div aria-busy="true" aria-label={t('map.loading')}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, marginBottom: 8 }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="error-state" role="alert">
          <div className="error-state-icon">⚠️</div>
          <p>{t('error')}</p>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={fetchHeatmap} id="retry-heatmap-btn">
            {t('retry')}
          </button>
        </div>
      )}

      {data && !error && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          role="list"
          aria-label={t('map.zones')}
        >
          {data.stadium_zones.map(zone => (
            <div key={zone.zone_id} role="listitem">
              <ZoneCard
                zone={zone}
                isSelected={selectedZone === zone.zone_id}
                onClick={() => setSelectedZone(prev => prev === zone.zone_id ? null : zone.zone_id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
