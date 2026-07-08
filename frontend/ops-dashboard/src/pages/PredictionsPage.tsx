import { useEffect, useState, useCallback } from 'react'
import type { PredictionItem } from '../types'

const API = '/api'

const RISK_COLOR: Record<string, string> = {
  high: 'var(--accent-red)',
  medium: 'var(--accent-orange)',
  low: 'var(--accent-green)',
}

function PredBar({ current, predicted, risk }: { current: number; predicted: number; risk: string }) {
  const color = RISK_COLOR[risk] ?? 'var(--accent-green)'
  return (
    <div className="pred-bar-wrap" role="img" aria-label={`${Math.round(current)}% current, ${Math.round(predicted)}% predicted`}>
      <div className="pred-bar-current" style={{ width: `${current}%`, background: 'var(--accent-blue)' }} />
      <div className="pred-bar-predicted" style={{ width: `${predicted}%`, background: color }} />
    </div>
  )
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<PredictionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lookahead, setLookahead] = useState(20)
  const [running, setRunning] = useState(false)

  const runPredictions = useCallback(async (mins: number) => {
    setRunning(true)
    try {
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookahead_minutes: mins, language: 'en' }),
      })
      const data = await res.json()
      setPredictions(data.predictions ?? [])
    } finally {
      setRunning(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    runPredictions(lookahead)
    const id = setInterval(() => runPredictions(lookahead), 60_000)
    return () => clearInterval(id)
  }, [runPredictions, lookahead])

  return (
    <section className="fade-in" aria-labelledby="pred-title">
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }} id="pred-title">
          🔮 Bottleneck Predictions
        </h1>
        <div className="flex gap-2 items-center">
          <select
            className="ops-input ops-select"
            value={lookahead}
            onChange={e => { setLookahead(Number(e.target.value)); runPredictions(Number(e.target.value)) }}
            style={{ width: 130 }}
            aria-label="Prediction lookahead"
            id="lookahead-select"
          >
            <option value={10}>10 min ahead</option>
            <option value={20}>20 min ahead</option>
            <option value={30}>30 min ahead</option>
          </select>
          <button
            className="btn-ops btn-ops-primary btn-ops-sm"
            onClick={() => runPredictions(lookahead)}
            disabled={running}
            aria-busy={running}
            id="run-predict-btn"
          >
            {running ? '⏳ Running…' : '▶ Run Now'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3" style={{ marginBottom: '1rem' }}>
        {[
          { color: 'var(--accent-blue)', label: 'Current' },
          { color: 'var(--accent-green)', label: 'Predicted (low risk)' },
          { color: 'var(--accent-orange)', label: 'Predicted (medium)' },
          { color: 'var(--accent-red)', label: 'Predicted (high risk)' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">
          Gate/Zone Congestion Forecast — Next {lookahead} minutes
          <span className="text-xs text-muted">AI + Rules engine</span>
        </div>

        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="pred-row">
            <div className="skeleton-dark" style={{ height: 14, width: 70 }} />
            <div className="skeleton-dark" style={{ flex: 1, height: 20 }} />
            <div className="skeleton-dark" style={{ height: 14, width: 30 }} />
          </div>
        ))}

        {!loading && predictions.map(pred => (
          <div key={pred.gate} className="pred-row" aria-label={`${pred.gate}: ${pred.risk_level} risk`}>
            <div className="pred-gate">{pred.gate}</div>
            <PredBar
              current={pred.current_capacity_percent}
              predicted={pred.predicted_capacity_percent}
              risk={pred.risk_level}
            />
            <div className="pred-pct" style={{ color: RISK_COLOR[pred.risk_level] }}>
              {Math.round(pred.predicted_capacity_percent)}%
            </div>
          </div>
        ))}
      </div>

      {/* Detail table */}
      {!loading && predictions.length > 0 && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <div className="panel-title">Prediction Details</div>
          <div className="ops-table-wrapper">
            <table className="ops-table" aria-label="Prediction details">
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Risk</th>
                  <th>Time to Critical</th>
                  <th>Confidence</th>
                  <th>Reason</th>
                  <th>Recommended Action</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map(pred => (
                  <tr key={pred.gate}>
                    <td className="font-bold">{pred.gate}</td>
                    <td>
                      <span className={`risk-${pred.risk_level}`} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        {pred.risk_level}
                      </span>
                    </td>
                    <td className="nowrap">{pred.time_to_critical}</td>
                    <td>{pred.confidence_percent}%</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {pred.reason}
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pred.recommended_action}
                    </td>
                    <td>
                      <span style={{ background: pred.ai_source === 'gemini' ? 'rgba(168,85,247,0.15)' : 'var(--accent-blue-dim)', color: pred.ai_source === 'gemini' ? 'var(--accent-purple)' : 'var(--accent-blue)', padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 700 }}>
                        {pred.ai_source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
