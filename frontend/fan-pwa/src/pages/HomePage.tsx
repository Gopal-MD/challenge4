import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import type { SSEStatus } from '../hooks/useSSE'
import type { StadiumStatus } from '../types'

interface HomePageProps {
  sseStatus: SSEStatus
}

const API_BASE = '/api'

export default function HomePage({ sseStatus }: HomePageProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<StadiumStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/crowd-heatmap`)
      .then(r => r.json())
      .then(data => {
        setStatus({
          avg_occupancy: data.stadium_level_stats.occupancy_percent / 100,
          busiest_section: data.stadium_zones[0]?.zone_name ?? 'Gate A',
          metro_delay_minutes: 8,
          weather_condition: 'rain',
        })
      })
      .catch(() => {
        // Fallback mock
        setStatus({
          avg_occupancy: 0.78,
          busiest_section: 'Gate A Concourse',
          metro_delay_minutes: 8,
          weather_condition: 'rain',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const quickActions = [
    { to: '/navigate', icon: '🗺️', label: t('home.quickActions.navigate'), id: 'quick-navigate' },
    { to: '/chat', icon: '💬', label: t('home.quickActions.chat'), id: 'quick-chat' },
    { to: '/map', icon: '📡', label: t('home.quickActions.map'), id: 'quick-map' },
    { to: '/alerts', icon: '🔔', label: t('home.quickActions.alerts'), id: 'quick-alerts' },
  ]

  const weatherIcon = {
    clear: '☀️', sunny: '☀️', rain: '🌧️', cloudy: '⛅', storm: '⛈️'
  }[status?.weather_condition ?? 'clear'] ?? '🌤️'

  return (
    <section aria-labelledby="home-hero-title">
      {/* Hero */}
      <div className="home-hero">
        <span className="home-hero-emoji" aria-hidden="true">⚽</span>
        <h1 className="home-hero-title" id="home-hero-title">
          MatchDay<br />Command
        </h1>
        <p className="home-hero-subtitle">{t('home.subtitle')}</p>

        {/* Connection indicator */}
        <div className="connection-indicator" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
          <span
            className={`connection-dot ${sseStatus === 'connected' ? 'connected' : 'reconnecting'}`}
            aria-hidden="true"
          />
          <span className="visually-hidden">
            {sseStatus === 'connected' ? t('alerts.connected') : t('alerts.reconnecting')}
          </span>
          <span aria-hidden="true">{sseStatus === 'connected' ? t('alerts.connected') : t('alerts.reconnecting')}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-grid" role="list" aria-label="Quick actions">
        {quickActions.map(action => (
          <Link
            key={action.to}
            to={action.to}
            className="quick-action-card"
            id={action.id}
            role="listitem"
          >
            <span className="quick-action-icon" aria-hidden="true">{action.icon}</span>
            <span className="quick-action-label">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Live Status */}
      <div className="card mt-4" aria-labelledby="live-status-title">
        <h2 className="card-title" id="live-status-title">
          <span aria-hidden="true">📊</span> {t('home.liveStatus')}
        </h2>

        {loading ? (
          <div aria-busy="true" aria-label={t('loading')}>
            <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 20 }} />
          </div>
        ) : status ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Occupancy */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted">{t('home.occupancy')}</span>
                <span className="font-bold" aria-label={`${Math.round(status.avg_occupancy * 100)}% occupancy`}>
                  {Math.round(status.avg_occupancy * 100)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(status.avg_occupancy * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('home.occupancy')}
                style={{
                  height: 8,
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  height: '100%',
                  width: `${status.avg_occupancy * 100}%`,
                  background: status.avg_occupancy > 0.85 ? 'var(--color-danger)' :
                    status.avg_occupancy > 0.7 ? 'var(--color-warning)' : 'var(--color-success)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            {/* Metro + Weather */}
            <div className="flex gap-3">
              <div className="transit-card" style={{ flex: 1 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🚇</div>
                <div className="text-xs text-muted">{t('home.metroDelay')}</div>
                <div className="font-bold" style={{ color: status.metro_delay_minutes > 5 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {status.metro_delay_minutes} {t('home.minutes')}
                </div>
              </div>
              <div className="transit-card" style={{ flex: 1 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{weatherIcon}</div>
                <div className="text-xs text-muted">{t('home.weather')}</div>
                <div className="font-bold">{t(`home.${status.weather_condition}` as any) || status.weather_condition}</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">{t('error')}</p>
        )}
      </div>
    </section>
  )
}
