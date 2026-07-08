import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import OverviewPage from './pages/OverviewPage'
import IncidentsPage from './pages/IncidentsPage'
import PredictionsPage from './pages/PredictionsPage'
import BroadcastPage from './pages/BroadcastPage'
import HeatmapPage from './pages/HeatmapPage'

const NAV_ITEMS = [
  { to: '/', icon: '📊', label: 'Overview', id: 'nav-overview' },
  { to: '/incidents', icon: '🚨', label: 'Incidents', id: 'nav-incidents' },
  { to: '/predictions', icon: '🔮', label: 'Predictions', id: 'nav-predictions' },
  { to: '/broadcast', icon: '📢', label: 'Broadcast', id: 'nav-broadcast' },
  { to: '/heatmap', icon: '🗺️', label: 'Heatmap', id: 'nav-heatmap' },
]

const CLOCK = () => {
  const now = new Date()
  return <span className="mono text-xs" style={{ color: 'var(--text-secondary)' }}>
    {now.toUTCString().slice(0, 25)}
  </span>
}

export default function App() {
  const [clockStr] = useState(() => new Date().toUTCString().slice(0, 25))

  return (
    <div className="ops-shell">
      {/* Header */}
      <header className="ops-header" role="banner">
        <div className="ops-header-logo" id="ops-logo">
          <span aria-hidden="true">⚽</span>
          <span>MatchDay Command</span>
          <span style={{ opacity: 0.5, fontWeight: 400, fontSize: '0.75rem' }}>OPS CENTER</span>
        </div>

        <div className="ops-header-center" role="complementary" aria-label="Live stadium metrics">
          <div className="ops-kpi" aria-label="Stadium occupancy">
            <span className="ops-kpi-value" style={{ color: 'var(--accent-orange)' }}>78%</span>
            <span className="ops-kpi-label">Occupancy</span>
          </div>
          <div className="ops-kpi" aria-label="Active incidents">
            <span className="ops-kpi-value" style={{ color: 'var(--accent-red)' }}>2</span>
            <span className="ops-kpi-label">Active Incidents</span>
          </div>
          <div className="ops-kpi" aria-label="Fan sessions">
            <span className="ops-kpi-value" style={{ color: 'var(--accent-green)' }}>8,342</span>
            <span className="ops-kpi-label">Fan Sessions</span>
          </div>
          <div className="ops-kpi" aria-label="Metro delay">
            <span className="ops-kpi-value" style={{ color: 'var(--accent-gold)' }}>8 min</span>
            <span className="ops-kpi-label">Metro Delay</span>
          </div>
        </div>

        <div className="ops-header-right">
          <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>{clockStr} UTC</span>
          <div className="status-dot" aria-label="System online">Live</div>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="ops-sidebar" role="navigation" aria-label="Ops navigation">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.id}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-btn ${isActive ? 'active' : ''}`}
            aria-label={item.label}
            title={item.label}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="sidebar-label">{item.label.slice(0, 4)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main */}
      <main className="ops-main" id="main-content" role="main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="/broadcast" element={<BroadcastPage />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
        </Routes>
      </main>
    </div>
  )
}
