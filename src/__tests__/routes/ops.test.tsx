import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  useServerFn: () => async () => ({
    priority: 'High',
    actionPlan: 'Dispatch security immediately.',
  }),
  createServerFn: () => ({
    validator: () => ({
      handler: () => async () => ({}),
    }),
    handler: () => async () => ({}),
  }),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: () => (config: Record<string, unknown>) => config,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock('@/components/mode-toggle', () => ({
  ModeToggle: () => <div data-testid="mode-toggle" />,
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: () => () => {},
    emit: vi.fn(),
    connected: false,
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { OpsPage } from '@/routes/ops';

describe('OpsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the operations dashboard', () => {
    render(<OpsPage />);
    expect(screen.getByText('FIFA 26')).toBeInTheDocument();
    expect(screen.getByText('Live MatchDay Overview')).toBeInTheDocument();
  });

  it('has all required navigation tabs', () => {
    render(<OpsPage />);
    expect(screen.getByText('Map View')).toBeInTheDocument();
    expect(screen.getByText('Crowd Density')).toBeInTheDocument();
    expect(screen.getByText('Incidents')).toBeInTheDocument();
    expect(screen.getByText('Broadcast')).toBeInTheDocument();
    expect(screen.getByText('Volunteers')).toBeInTheDocument();
    expect(screen.getByText('Sustainability')).toBeInTheDocument();
  });

  it('switches to crowd density view', async () => {
    const user = userEvent.setup();
    render(<OpsPage />);
    await user.click(screen.getByRole('button', { name: /crowd density/i }));
    expect(screen.getByText('Density over time')).toBeInTheDocument();
  });

  it('switches to incidents view', async () => {
    const user = userEvent.setup();
    render(<OpsPage />);
    await user.click(screen.getByRole('button', { name: /incidents/i }));
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows AI Brief button in topbar', () => {
    render(<OpsPage />);
    expect(screen.getByRole('button', { name: /ai brief/i })).toBeInTheDocument();
  });

  it('displays system status in sidebar', () => {
    render(<OpsPage />);
    expect(screen.getByText('All systems nominal')).toBeInTheDocument();
  });
});
