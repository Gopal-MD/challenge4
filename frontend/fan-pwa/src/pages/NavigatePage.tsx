import { useState, useRef, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteResult } from '../types'

const API_BASE = '/api'

const GATES = ['Gate A', 'Gate B', 'Gate C', 'Gate D', 'Gate E']
const DESTINATIONS = ['Section 101', 'Section 205', 'Restroom Level 1', 'Restroom Level 2', 'Food Court', 'Medical Bay', 'Family Area', 'Exit Gate A', 'Exit Gate C', 'Parking North']

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  return `${mins} min`
}

export default function NavigatePage() {
  const { t, i18n } = useTranslation()
  const formId = useId()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [routeType, setRouteType] = useState('fastest')
  const [accessibility, setAccessibility] = useState({
    wheelchair: false,
    visual: false,
    hearing: false,
    mobility: false,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RouteResult | null>(null)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.focus()
    }
  }, [result])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!from.trim() || !to.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    const accessibilityList: string[] = []
    if (accessibility.wheelchair) accessibilityList.push('wheelchair')
    if (accessibility.visual) accessibilityList.push('visual_impairment')
    if (accessibility.hearing) accessibilityList.push('hearing_impairment')
    if (accessibility.mobility) accessibilityList.push('mobility_limited')

    try {
      const res = await fetch(`${API_BASE}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_location: from,
          destination: to,
          accessibility_requirements: accessibilityList,
          preferred_route_type: routeType,
          language: i18n.language,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: RouteResult = await res.json()
      setResult(data)
    } catch {
      setError(t('navigate.noRoute'))
    } finally {
      setLoading(false)
    }
  }

  const densityColor = (d: string) =>
    d === 'low' ? 'var(--color-success)' : d === 'medium' ? 'var(--color-warning)' : 'var(--color-danger)'

  return (
    <section aria-labelledby="navigate-title">
      <h1 className="card-title" id="navigate-title">
        <span aria-hidden="true">🗺️</span> {t('navigate.title')}
      </h1>

      <form onSubmit={handleSubmit} noValidate id={`${formId}-form`} aria-label="Route calculation form">
        {/* From */}
        <div className="form-group">
          <label className="form-label" htmlFor={`${formId}-from`}>{t('navigate.from')}</label>
          <input
            id={`${formId}-from`}
            type="text"
            className="form-control"
            placeholder={t('navigate.fromPlaceholder')}
            value={from}
            onChange={e => setFrom(e.target.value)}
            list={`${formId}-gates`}
            required
            aria-required="true"
          />
          <datalist id={`${formId}-gates`}>
            {GATES.map(g => <option key={g} value={g} />)}
          </datalist>
        </div>

        {/* To */}
        <div className="form-group">
          <label className="form-label" htmlFor={`${formId}-to`}>{t('navigate.to')}</label>
          <input
            id={`${formId}-to`}
            type="text"
            className="form-control"
            placeholder={t('navigate.toPlaceholder')}
            value={to}
            onChange={e => setTo(e.target.value)}
            list={`${formId}-destinations`}
            required
            aria-required="true"
          />
          <datalist id={`${formId}-destinations`}>
            {DESTINATIONS.map(d => <option key={d} value={d} />)}
          </datalist>
        </div>

        {/* Route Type */}
        <div className="form-group">
          <label className="form-label" htmlFor={`${formId}-route-type`}>{t('navigate.routeType')}</label>
          <select
            id={`${formId}-route-type`}
            className="form-control form-select"
            value={routeType}
            onChange={e => setRouteType(e.target.value)}
          >
            <option value="fastest">{t('navigate.fastest')}</option>
            <option value="accessible">{t('navigate.accessible')}</option>
            <option value="least_crowded">{t('navigate.leastCrowded')}</option>
            <option value="lowest_carbon">{t('navigate.lowestCarbon')}</option>
          </select>
        </div>

        {/* Accessibility */}
        <div className="form-group">
          <fieldset>
            <legend className="form-label">{t('navigate.accessibility')}</legend>
            <div className="checkbox-group">
              {([
                ['wheelchair', t('navigate.wheelchair')],
                ['visual', t('navigate.visual')],
                ['hearing', t('navigate.hearing')],
                ['mobility', t('navigate.mobility')],
              ] as const).map(([key, label]) => (
                <label key={key} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={accessibility[key]}
                    onChange={e => setAccessibility(prev => ({ ...prev, [key]: e.target.checked }))}
                    id={`${formId}-a11y-${key}`}
                  />
                  <span className="checkbox-label">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || !from.trim() || !to.trim()}
          aria-busy={loading}
          id="route-submit-btn"
        >
          {loading ? (
            <>
              <div className="loading-dots" aria-hidden="true">
                <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
              </div>
              {t('navigate.calculating')}
            </>
          ) : t('navigate.getRoute')}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="card" role="alert" style={{ borderColor: 'var(--color-danger)', marginTop: '1rem' }}>
          <p className="text-sm" style={{ color: 'var(--color-danger)' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className="card"
          style={{ marginTop: '1rem', animation: 'fadeInUp 0.3s ease' }}
          ref={resultRef}
          tabIndex={-1}
          aria-live="polite"
          aria-label={t('navigate.routeResult')}
        >
          <h2 className="card-title">
            <span aria-hidden="true">✅</span> {t('navigate.routeResult')}
            {result.source === 'fallback_rules' && (
              <span className="badge badge-muted" style={{ marginLeft: 8, fontWeight: 400 }}>offline</span>
            )}
          </h2>

          {/* Route metadata */}
          <div className="route-meta" aria-label="Route details">
            <div className="route-meta-item">
              <span aria-hidden="true">📏</span>
              <span>{t('navigate.distance')}: <strong>{result.primary_route.distance_meters}{t('navigate.meters')}</strong></span>
            </div>
            <div className="route-meta-item">
              <span aria-hidden="true">⏱️</span>
              <span>{t('navigate.eta')}: <strong>{formatTime(result.primary_route.eta_seconds)}</strong></span>
            </div>
            {result.primary_route.carbon_kg_equivalent === 0 && (
              <div className="route-meta-item">
                <span aria-hidden="true">🌿</span>
                <span className="carbon-value" style={{ fontSize: 'var(--font-size-sm)' }}>{t('navigate.carbonSaved')}: 0 kg</span>
              </div>
            )}
          </div>

          {/* Waypoints */}
          <div className="route-steps" style={{ marginTop: '1rem' }} aria-label={t('navigate.steps')}>
            {result.primary_route.waypoints.map((wp, i) => (
              <div key={i} className="route-step">
                <div className="route-step-number" aria-hidden="true">{i + 1}</div>
                <span>{wp}</span>
              </div>
            ))}
          </div>

          {/* Accessibility notes */}
          {result.primary_route.accessibility_notes && (
            <div style={{
              marginTop: '0.75rem', padding: '0.75rem', background: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)'
            }}>
              <span aria-hidden="true">♿ </span>
              <strong>{t('navigate.accessibilityNotes')}:</strong> {result.primary_route.accessibility_notes}
            </div>
          )}

          {/* Transit info */}
          <div style={{ marginTop: '0.75rem' }}>
            <div className="text-sm text-muted">{t('navigate.metroNearby')}</div>
            <div className="text-sm font-semibold">{result.transit_info.metro_station_nearby}</div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 4 }}>
              {result.transit_info.accessibility_features.map(f => (
                <span key={f} className="badge badge-primary">{f.replace('_', ' ')}</span>
              ))}
            </div>
          </div>

          {/* Alternative routes */}
          {result.alternatives.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div className="text-sm text-muted" style={{ marginBottom: 8 }}>{t('navigate.alternatives')}</div>
              {result.alternatives.map((alt, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.75rem', background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-md)', marginBottom: 6,
                }}>
                  <span className="text-sm">{alt.route_type.replace('_', ' ')}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted">{formatTime(alt.eta_seconds)}</span>
                    <span
                      className="badge"
                      style={{ background: densityColor(alt.predicted_density) + '22', color: densityColor(alt.predicted_density) }}
                    >
                      {alt.predicted_density}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
