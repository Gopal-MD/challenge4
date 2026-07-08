import { useTranslation } from 'react-i18next'
import type { AccessibilitySettings } from '../types'

interface Props {
  id: string
  settings: AccessibilitySettings
  onChange: (s: AccessibilitySettings) => void
  onClose: () => void
}

interface ToggleRowProps {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ id, label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="toggle-row">
      <label className="toggle-label" htmlFor={id}>{label}</label>
      <div className="toggle-switch">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          role="switch"
          aria-checked={checked}
        />
        <div className="toggle-track" />
      </div>
    </div>
  )
}

export default function AccessibilityPanel({ id, settings, onChange, onClose }: Props) {
  const { t } = useTranslation()

  function update(key: keyof AccessibilitySettings, value: boolean) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div
      className="a11y-panel"
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      aria-modal="true"
    >
      <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
        <h2 className="text-sm font-semibold" id={`${id}-title`}>
          ♿ {t('accessibility.title')}
        </h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label={t('close')}
          id="a11y-panel-close-btn"
        >
          ✕
        </button>
      </div>

      <ToggleRow
        id="toggle-high-contrast"
        label={t('accessibility.highContrast')}
        checked={settings.highContrast}
        onChange={v => update('highContrast', v)}
      />
      <ToggleRow
        id="toggle-large-text"
        label={t('accessibility.largeText')}
        checked={settings.largeText}
        onChange={v => update('largeText', v)}
      />
      <ToggleRow
        id="toggle-reduce-motion"
        label={t('accessibility.reduceMotion')}
        checked={settings.reduceMotion}
        onChange={v => update('reduceMotion', v)}
      />
      <ToggleRow
        id="toggle-screen-reader"
        label={t('accessibility.screenReader')}
        checked={settings.screenReader}
        onChange={v => update('screenReader', v)}
      />
    </div>
  )
}
