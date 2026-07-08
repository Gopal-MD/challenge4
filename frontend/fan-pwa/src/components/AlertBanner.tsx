import { useTranslation } from 'react-i18next'
import type { BroadcastEvent } from '../types'

interface Props {
  event: BroadcastEvent
  language: string
  onDismiss: () => void
}

const URGENCY_CLASS: Record<string, string> = {
  immediate: 'alert-immediate',
  elevated: 'alert-elevated',
  advisory: 'alert-advisory',
}

const URGENCY_ICON: Record<string, string> = {
  immediate: '🚨',
  elevated: '⚠️',
  advisory: 'ℹ️',
}

export default function AlertBanner({ event, language, onDismiss }: Props) {
  const { t } = useTranslation()
  const urgencyClass = URGENCY_CLASS[event.urgency] ?? 'alert-advisory'
  const icon = URGENCY_ICON[event.urgency] ?? 'ℹ️'
  const message = event.messages[language] || event.messages.en || ''

  return (
    <div
      className={`alert-banner ${urgencyClass}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby="alert-banner-heading"
    >
      <span style={{ fontSize: '1.5rem', flexShrink: 0 }} aria-hidden="true">{icon}</span>
      <div style={{ flex: 1 }}>
        <div
          id="alert-banner-heading"
          style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}
        >
          {t(`alerts.${event.urgency}`)} — {event.affected_gates.join(', ')}
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.4 }}>{message}</div>
        <div style={{ marginTop: 4, fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
          → {event.recommended_alternative_gate}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="btn btn-ghost btn-sm"
        aria-label={t('alerts.dismiss')}
        style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
        id="alert-banner-dismiss-btn"
      >
        ✕
      </button>
    </div>
  )
}
