import { useState, useId } from 'react'
import type { BroadcastResult } from '../types'

const API = '/api'
const GATES = ['Gate A', 'Gate B', 'Gate C', 'Gate D', 'Gate E']
const ALT_GATES = ['Gate B', 'Gate C', 'Gate D', 'Gate E']
const LANGUAGES = [
  { code: 'en', label: 'EN 🇬🇧' }, { code: 'es', label: 'ES 🇪🇸' }, { code: 'fr', label: 'FR 🇫🇷' },
  { code: 'pt', label: 'PT 🇧🇷' }, { code: 'de', label: 'DE 🇩🇪' }, { code: 'ar', label: 'AR 🇸🇦' },
  { code: 'zh', label: 'ZH 🇨🇳' }, { code: 'ja', label: 'JA 🇯🇵' }, { code: 'hi', label: 'HI 🇮🇳' },
]
const REASONS = [
  'High congestion detected by sensors',
  'Metro delay causing excess arrivals',
  'Weather driving indoor foot traffic',
  'Incident response — area clearance',
  'Capacity limit reached',
  'Pre-match surge — gate overflow',
]

export default function BroadcastPage() {
  const formId = useId()
  const [affectedGates, setAffectedGates] = useState<string[]>(['Gate A'])
  const [alternativeGate, setAlternativeGate] = useState('Gate C')
  const [reason, setReason] = useState(REASONS[0])
  const [urgency, setUrgency] = useState<'immediate' | 'elevated' | 'advisory'>('immediate')
  const [languages, setLanguages] = useState<string[]>(['en', 'es', 'fr', 'pt', 'de', 'ar', 'zh', 'ja', 'hi'])
  const [routeRecalculate, setRouteRecalculate] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [error, setError] = useState('')

  function toggleGate(gate: string) {
    setAffectedGates(prev =>
      prev.includes(gate) ? prev.filter(g => g !== gate) : [...prev, gate]
    )
  }

  function toggleLang(code: string) {
    setLanguages(prev =>
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
    )
  }

  async function handleSend() {
    if (affectedGates.length === 0 || languages.length === 0) return
    setSending(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`${API}/broadcast-reroute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: `reroute_${Date.now()}`,
          affected_gates: affectedGates,
          recommended_alternative_gate: alternativeGate,
          reason,
          broadcast_languages: languages,
          urgency,
          route_recalculate: routeRecalculate,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: BroadcastResult = await res.json()
      setResult(data)
    } catch (e) {
      setError(`Broadcast failed: ${e}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="fade-in" aria-labelledby="broadcast-title">
      <h1 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '1rem' }} id="broadcast-title">
        📢 Reroute Broadcast
      </h1>

      <div className="grid-2">
        {/* Form */}
        <div className="panel" aria-labelledby={`${formId}-form-title`}>
          <div className="panel-title" id={`${formId}-form-title`}>Configure Broadcast</div>

          <div className="broadcast-form">
            {/* Urgency */}
            <div>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }}>Urgency Level</label>
              <div className="urgency-btns" role="radiogroup" aria-label="Urgency level">
                {(['immediate', 'elevated', 'advisory'] as const).map(u => (
                  <button
                    key={u}
                    className={`urgency-btn ${u} ${urgency === u ? 'selected' : ''}`}
                    onClick={() => setUrgency(u)}
                    role="radio"
                    aria-checked={urgency === u}
                    id={`urgency-${u}`}
                  >
                    {u === 'immediate' ? '🚨' : u === 'elevated' ? '⚠️' : 'ℹ️'} {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Affected gates */}
            <div>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }}>
                Affected Gates <span aria-live="polite">({affectedGates.length} selected)</span>
              </label>
              <div className="gate-chips" role="group" aria-label="Select affected gates">
                {GATES.map(gate => (
                  <button
                    key={gate}
                    className={`gate-chip ${affectedGates.includes(gate) ? 'selected' : ''}`}
                    onClick={() => toggleGate(gate)}
                    aria-pressed={affectedGates.includes(gate)}
                    id={`gate-chip-${gate.replace(' ', '-')}`}
                  >
                    {gate}
                  </button>
                ))}
              </div>
            </div>

            {/* Alternative gate */}
            <div>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }} htmlFor={`${formId}-alt-gate`}>
                Recommended Alternative
              </label>
              <select
                id={`${formId}-alt-gate`}
                className="ops-input ops-select"
                value={alternativeGate}
                onChange={e => setAlternativeGate(e.target.value)}
              >
                {ALT_GATES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }} htmlFor={`${formId}-reason`}>
                Reason
              </label>
              <select
                id={`${formId}-reason`}
                className="ops-input ops-select"
                value={reason}
                onChange={e => setReason(e.target.value)}
              >
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Languages */}
            <div>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }}>
                Broadcast Languages <span aria-live="polite">({languages.length}/9)</span>
              </label>
              <div className="lang-chips" role="group" aria-label="Select broadcast languages">
                {LANGUAGES.map(({ code, label }) => (
                  <button
                    key={code}
                    className={`lang-chip ${languages.includes(code) ? 'selected' : ''}`}
                    onClick={() => toggleLang(code)}
                    aria-pressed={languages.includes(code)}
                    id={`lang-chip-${code}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Route recalculate toggle */}
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
              <input
                type="checkbox"
                checked={routeRecalculate}
                onChange={e => setRouteRecalculate(e.target.checked)}
                id="route-recalc-checkbox"
                style={{ accentColor: 'var(--accent-blue)' }}
              />
              Push route recalculation to fan devices
            </label>

            {/* Send button */}
            <button
              className="btn-ops btn-ops-primary btn-ops-full"
              onClick={handleSend}
              disabled={sending || affectedGates.length === 0 || languages.length === 0}
              aria-busy={sending}
              id="send-broadcast-btn"
            >
              {sending ? '⏳ Sending…' : `📢 Broadcast to ${languages.length} Languages`}
            </button>

            {error && (
              <div role="alert" style={{ color: 'var(--accent-red)', fontSize: '0.7rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="panel" aria-labelledby="broadcast-result-title" aria-live="polite">
          <div className="panel-title" id="broadcast-result-title">Broadcast Result</div>

          {!result && !sending && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '3rem 0' }}>
              Configure and send a broadcast to see results here
            </div>
          )}

          {sending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-dark" style={{ height: 24 }} />
              ))}
            </div>
          )}

          {result && (
            <div className="broadcast-result">
              {/* Delivery stats */}
              <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                    {result.delivered_count.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Delivered</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: result.failed_count > 50 ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                    {result.failed_count.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Failed</div>
                </div>
              </div>

              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Target sessions: {result.target_fan_sessions.toLocaleString()} ·
                ARIA live: {result.aria_live_announcements ? '✓' : '✗'} ·
                Screen reader: {result.screen_reader_compatible ? '✓' : '✗'}
              </div>

              {/* Messages */}
              <div style={{ fontWeight: 600, fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Messages sent ({Object.keys(result.messages_pushed).length} languages)
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {Object.entries(result.messages_pushed).map(([lang, msg]) => (
                  <div key={lang} className="broadcast-lang-msg">
                    <span className="broadcast-lang-code">{lang}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
