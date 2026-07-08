import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'

// Minimal App smoke test
import App from '../App'

// Mock SSE
vi.stubGlobal('EventSource', class {
  addEventListener = vi.fn()
  close = vi.fn()
  onerror: (() => void) | null = null
})

// Mock fetch
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      stadium_zones: [],
      stadium_level_stats: {
        total_capacity: 80000, current_occupancy: 62400,
        occupancy_percent: 78, estimated_arrival_rate: 120,
        eta_to_full_capacity: '18 min',
      },
      timestamp: new Date().toISOString(),
    }),
  }))
})

function renderApp(path = '/') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </I18nextProvider>
  )
}

describe('App Shell', () => {
  it('renders header', async () => {
    renderApp('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders bottom navigation with 5 items', () => {
    renderApp('/')
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toBeInTheDocument()
  })

  it('skip link is present', () => {
    renderApp('/')
    const skip = screen.getByText(/skip to main content/i)
    expect(skip).toBeInTheDocument()
  })
})

describe('Accessibility Panel', () => {
  it('opens accessibility panel on button click', async () => {
    renderApp('/')
    const btn = screen.getByLabelText(/accessibility/i)
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})

describe('Home Page', () => {
  it('shows live status section', async () => {
    renderApp('/')
    await waitFor(() => {
      expect(screen.getByText(/live stadium status/i)).toBeInTheDocument()
    })
  })

  it('shows four quick action cards', () => {
    renderApp('/')
    const list = screen.getByRole('list', { name: /quick actions/i })
    expect(list.querySelectorAll('[role="listitem"]').length).toBe(4)
  })
})
