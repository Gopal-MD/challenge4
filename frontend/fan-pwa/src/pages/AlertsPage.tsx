import { useTranslation } from 'react-i18next'
import type { BroadcastEvent } from '../types'
import type { SSEStatus } from '../hooks/useSSE'

interface AlertsPageProps {
  sseStatus: SSEStatus
  latestEvent: BroadcastEvent | null
  dismiss: () => void
}

const URGENCY_STYLES = {
  immediate: { bg: 'rgba(239,68,68,0.12)', border: 'var(--color-danger)', badge: 'badge-danger' },
  elevated: { bg: 'rgba(245,158,11,0.12)', border: 'var(--color-warning)', badge: 'badge-warning' },
  advisory: { bg: 'var(--color-primary-light)', border: 'var(--color-primary)', badge: 'badge-primary' },
}

export default function AlertsPage({ sseStatus, latestEvent, dismiss }: AlertsPageProps) {
  const { t, i18n } = useTranslation()
  const style = latestEvent ? (URGENCY_STYLES[latestEvent.urgency] ?? URGENCY_STYLES.advisory) : null

  return (
    <section aria-labelledby="alerts-title">
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <h1 className="card-title" id="alerts-title" style={{ marginBottom: 0 }}>
          <span aria-hidden="true">🔔</span> {t('alerts.title')}
        </h1>
        <div className="connection-indicator">
          <span
            className={`connection-dot ${sseStatus === 'connected' ? 'connected' : 'reconnecting'}`}
            aria-hidden="true"
          />
          <span className="text-xs">
            {sseStatus === 'connected' ? t('alerts.connected') : t('alerts.reconnecting')}
          </span>
        </div>
      </div>

      {/* Active alert */}
      {latestEvent ? (
        <div
          className="card"
          style={{
            background: style!.bg,
            borderColor: style!.border,
            borderWidth: 2,
            animation: 'fadeInUp 0.3s ease',
          }}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          aria-labelledby="alert-heading"
        >
          <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
            <div className="flex gap-2 items-center">
              <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
                {latestEvent.urgency === 'immediate' ? '🚨' : latestEvent.urgency === 'elevated' ? '⚠️' : 'ℹ️'}
              </span>
              <span className={`badge ${style!.badge}`} id="alert-heading">
                {t(`alerts.${latestEvent.urgency}`)}
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={dismiss}
              aria-label={t('alerts.dismiss')}
              id="dismiss-alert-btn"
            >
              ✕
            </button>
          </div>

          {/* Message in user's language */}
          <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: '0.75rem' }}>
            {latestEvent.messages[i18n.language] || latestEvent.messages.en}
          </p>

          {/* Details */}
          <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              <span className="text-muted">{t('alerts.from')}: </span>
              <strong>{latestEvent.affected_gates.join(', ')}</strong>
            </div>
            <div>
              <span className="text-muted">{t('alerts.to')}: </span>
              <strong>{latestEvent.recommended_alternative_gate}</strong>
            </div>
            <div>
              <span className="text-muted">{t('alerts.reason')}: </span>
              {latestEvent.reason}
            </div>
          </div>

          {/* All language messages */}
          {Object.keys(latestEvent.messages).length > 1 && (
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {Object.keys(latestEvent.messages).length} languages
              </summary>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(latestEvent.messages).map(([lang, msg]) => (
                  <div key={lang} style={{ fontSize: 'var(--font-size-xs)' }}>
                    <span className="badge badge-muted" style={{ marginRight: 6 }}>{lang}</span>
                    {msg}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Time */}
          <div style={{ marginTop: '0.75rem', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            <time dateTime={latestEvent.timestamp}>
              {new Date(latestEvent.timestamp).toLocaleTimeString(i18n.language)}
            </time>
          </div>
        </div>
      ) : (
        /* No alerts state */
        <div className="error-state" aria-live="polite">
          <div className="error-state-icon">✅</div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '0.5rem' }}>
            {t('alerts.noAlerts')}
          </h2>
          <p className="text-sm text-muted">{t('alerts.noAlertsDesc')}</p>

          {/* SSE connection status */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div className="connection-indicator" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span
                className={`connection-dot ${sseStatus === 'connected' ? 'connected' : 'reconnecting'}`}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold">
                {sseStatus === 'connected' ? t('alerts.connected') : t('alerts.reconnecting')}
              </span>
            </div>
            <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
              Real-time alerts via Server-Sent Events
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
