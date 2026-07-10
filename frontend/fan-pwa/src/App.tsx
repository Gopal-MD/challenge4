import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { useSSE } from './hooks/useSSE'
import HomePage from './pages/HomePage'
import NavigatePage from './pages/NavigatePage'
import ChatPage from './pages/ChatPage'
import MapPage from './pages/MapPage'
import AlertsPage from './pages/AlertsPage'
import LanguageSwitcher from './components/LanguageSwitcher'
import AccessibilityPanel from './components/AccessibilityPanel'
import AlertBanner from './components/AlertBanner'
import type { AccessibilitySettings } from './types'

const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
]

export default function App() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { status, latestEvent, dismiss } = useSSE()
  const [a11y, setA11y] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReader: false,
  })
  const [showA11yPanel, setShowA11yPanel] = useState(false)

  // Apply accessibility settings to <html>
  useEffect(() => {
    const root = document.documentElement
    root.toggleAttribute('data-high-contrast', a11y.highContrast)
    root.toggleAttribute('data-large-text', a11y.largeText)
    root.toggleAttribute('data-reduce-motion', a11y.reduceMotion)
    // RTL for Arabic
    root.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    root.lang = i18n.language
  }, [a11y, i18n.language])

  const navItems = [
    { to: '/', label: t('nav.home'), icon: '🏟️', id: 'nav-home' },
    { to: '/navigate', label: t('nav.navigate'), icon: '🗺️', id: 'nav-navigate' },
    { to: '/chat', label: t('nav.chat'), icon: '💬', id: 'nav-chat' },
    { to: '/map', label: t('nav.map'), icon: '📡', id: 'nav-map' },
    { to: '/alerts', label: t('nav.alerts'), icon: '🔔', id: 'nav-alerts' },
  ]

  return (
    <div className="app-shell">
      {/* ARIA live region for screen readers */}
      <div
        id="sr-live-region"
        aria-live="assertive"
        aria-atomic="true"
        className="visually-hidden"
        role="status"
      />
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="header" role="banner">
        <div className="header-logo">
          <span className="header-logo-title">⚽ MatchDay Command</span>
          <span className="header-logo-subtitle">{t('appSubtitle')}</span>
        </div>
        <div className="header-controls">
          <LanguageSwitcher languages={LANGUAGES} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowA11yPanel(v => !v)}
            aria-label={t('accessibility.title')}
            aria-expanded={showA11yPanel}
            aria-controls="a11y-panel"
            id="a11y-toggle-btn"
          >
            ♿
          </button>
        </div>
      </header>

      {/* Accessibility Panel */}
      {showA11yPanel && (
        <AccessibilityPanel
          id="a11y-panel"
          settings={a11y}
          onChange={setA11y}
          onClose={() => setShowA11yPanel(false)}
        />
      )}

      {/* Reroute Alert Banner */}
      {latestEvent && (
        <AlertBanner
          event={latestEvent}
          language={i18n.language}
          onDismiss={dismiss}
        />
      )}

      {/* Main content */}
      <main id="main-content" className="main-content" role="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage sseStatus={status} />} />
          <Route path="/navigate" element={<NavigatePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/alerts" element={<AlertsPage sseStatus={status} latestEvent={latestEvent} dismiss={dismiss} />} />
        </Routes>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.id}
            end={item.to === '/'}
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            aria-current={location.pathname === item.to ? 'page' : undefined}
          >
            <span className="nav-btn-icon" aria-hidden="true">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
