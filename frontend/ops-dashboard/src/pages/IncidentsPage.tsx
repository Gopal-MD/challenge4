import { useEffect, useState, useCallback } from 'react'
import type { IncidentQueue, IncidentQueueItem } from '../types'

const API = '/api'

function SeverityBadge({ sev }: { sev: string }) {
  const cls = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' }[sev] ?? 'sev-low'
  return <span className={`sev-badge ${cls}`}>{sev}</span>
}

function StatusBadge({ status }: { status: string }) {
  const cls = `status-badge status-${status}`
  return <span className={cls}>{status.replace('_', ' ')}</span>
}

export default function IncidentsPage() {
  const [queue, setQueue] = useState<IncidentQueue | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof IncidentQueueItem>('severity')
  const [sortAsc, setSortAsc] = useState(true)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API}/incidents/queue`)
      const data: IncidentQueue = await res.json()
      setQueue(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    const id = setInterval(fetchQueue, 15_000)
    return () => clearInterval(id)
  }, [fetchQueue])

  function handleSort(field: keyof IncidentQueueItem) {
    if (sortField === field) setSortAsc(v => !v)
    else { setSortField(field); setSortAsc(true) }
  }

  const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  const incidents = queue?.active_incidents ?? []
  const filtered = incidents.filter(i => filter === 'all' || i.severity === filter || i.status === filter)
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'severity') {
      const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      return sortAsc ? diff : -diff
    }
    const av = String(a[sortField] ?? ''), bv = String(b[sortField] ?? '')
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const summary = queue?.summary

  return (
    <section className="fade-in" aria-labelledby="incidents-title">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }} id="incidents-title">
          🚨 Incident Queue
        </h1>
        <button className="btn-ops btn-ops-ghost btn-ops-sm" onClick={fetchQueue} id="refresh-incidents-btn">↻ Refresh</button>
      </div>

      {/* Summary chips */}
      {summary && (
        <div className="flex gap-2" style={{ marginBottom: '1rem' }} role="list" aria-label="Incident counts by severity">
          {[
            { key: 'all', label: `All (${incidents.length})`, cls: 'btn-ops-ghost' },
            { key: 'critical', label: `Critical (${summary.critical_count})`, cls: 'sev-critical' },
            { key: 'high', label: `High (${summary.high_count})`, cls: 'sev-high' },
            { key: 'medium', label: `Medium (${summary.medium_count})`, cls: 'sev-medium' },
            { key: 'low', label: `Low (${summary.low_count})`, cls: 'sev-low' },
          ].map(({ key, label, cls }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`btn-ops ${filter === key ? 'btn-ops-primary' : 'btn-ops-ghost'} btn-ops-sm`}
              aria-pressed={filter === key}
              role="listitem"
              id={`filter-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="panel">
        <div className="ops-table-wrapper">
          <table className="ops-table" aria-label="Incident queue" aria-busy={loading}>
            <thead>
              <tr>
                {([
                  ['severity', 'Severity'],
                  ['category', 'Category'],
                  ['location', 'Location'],
                  ['time_since_report', 'Reported'],
                  ['status', 'Status'],
                  ['next_action', 'Next Action'],
                ] as [keyof IncidentQueueItem, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    aria-sort={sortField === field ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    {label} {sortField === field ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton-dark" style={{ height: 12 }} /></td>
                  ))}
                </tr>
              ))}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No incidents matching filter
                  </td>
                </tr>
              )}
              {!loading && sorted.map(incident => (
                <tr key={incident.incident_id}>
                  <td><SeverityBadge sev={incident.severity} /></td>
                  <td className="nowrap">{incident.category.replace('_', ' ')}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {incident.location}
                  </td>
                  <td className="nowrap text-muted">{incident.time_since_report}</td>
                  <td><StatusBadge status={incident.status} /></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    {incident.next_action ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {queue && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            Last updated: {new Date(queue.timestamp).toLocaleTimeString()}
            · Auto-refresh every 15s
          </div>
        )}
      </div>
    </section>
  )
}
