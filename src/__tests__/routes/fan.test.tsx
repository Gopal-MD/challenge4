import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  useServerFn: () => async () => ({
    etaMinutes: 8,
    distanceM: 420,
    steps: [{ instruction: 'Head north to Section 101', distanceM: 120, icon: 'start' as const }],
    accessibilityNotes: ['Elevator available at Gate B'],
  }),
  createServerFn: () => ({
    validator: () => ({
      handler: () => async () => ({}),
    }),
    handler: () => async () => ({}),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (opts: { mutationFn: () => Promise<unknown> }) => ({
    mutate: () => opts.mutationFn(),
    isPending: false,
    data: null,
    error: null,
  }),
}));

vi.mock('@/lib/broadcast-store', () => ({
  useLatestBroadcast: () => null,
}));

vi.mock('@/components/mode-toggle', () => ({
  ModeToggle: () => <div data-testid="mode-toggle" />,
}));

vi.mock('@/components/Match/MatchScoreboard', () => ({
  MatchScoreboard: () => <div data-testid="match-scoreboard">Live Match</div>,
}));

import { FanPage } from '@/routes/fan';

describe('FanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the stadium navigation interface', () => {
    render(<FanPage />);
    expect(screen.getByText('Hey, Fan 👋')).toBeInTheDocument();
    expect(screen.getByText('Where to next?')).toBeInTheDocument();
  });

  it('shows language selector with 5 options', () => {
    render(<FanPage />);
    const select = document.querySelector('select')!;
    expect(select).toBeInTheDocument();
    expect(select.options).toHaveLength(5);
  });

  it('has accessibility options for wheelchair users', () => {
    render(<FanPage />);
    expect(screen.getByRole('button', { name: 'Wheelchair' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visual' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Low-sensory' })).toBeInTheDocument();
  });

  it('toggles wheelchair accessibility option', async () => {
    const user = userEvent.setup();
    render(<FanPage />);
    const wheelchairBtn = screen.getByRole('button', { name: 'Wheelchair' });
    await user.click(wheelchairBtn);
    expect(wheelchairBtn.className).toMatch(/bg-gradient-brand/);
  });

  it('renders start and destination inputs with defaults', () => {
    render(<FanPage />);
    expect(screen.getByDisplayValue('Gate B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Section 101')).toBeInTheDocument();
  });

  it('shows Get Route button', () => {
    render(<FanPage />);
    expect(screen.getByRole('button', { name: /get route/i })).toBeInTheDocument();
  });

  it('renders match scoreboard section', () => {
    render(<FanPage />);
    expect(screen.getByTestId('match-scoreboard')).toBeInTheDocument();
  });
});
