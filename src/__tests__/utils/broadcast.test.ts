/**
 * @file broadcast-store.test.ts
 * Unit tests for the broadcast message store and its data structures.
 */

import { describe, it, expect } from 'vitest';

// ─── Broadcast data validation utilities ─────────────────────────────────────
// These mirror logic used in the Ops Dashboard for broadcast management.

type BroadcastSeverity = 'info' | 'warning' | 'critical';

interface Broadcast {
  id: string;
  message: string;
  severity: BroadcastSeverity;
  language: string;
  createdAt: number;
}

function formatBroadcastTimestamp(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  return `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? 's' : ''} ago`;
}

function filterBroadcastsByLanguage(broadcasts: Broadcast[], lang: string): Broadcast[] {
  return broadcasts.filter((b) => b.language === lang || b.language === 'all');
}

function sortBroadcastsByRecency(broadcasts: Broadcast[]): Broadcast[] {
  return [...broadcasts].sort((a, b) => b.createdAt - a.createdAt);
}

function getCriticalBroadcasts(broadcasts: Broadcast[]): Broadcast[] {
  return broadcasts.filter((b) => b.severity === 'critical');
}

function validateBroadcastMessage(message: string): { valid: boolean; error?: string } {
  if (!message.trim()) return { valid: false, error: 'Message cannot be empty.' };
  if (message.length > 500) return { valid: false, error: 'Message is too long (max 500 chars).' };
  return { valid: true };
}

// ─── Test Data ────────────────────────────────────────────────────────────────
const makeBroadcast = (overrides: Partial<Broadcast> = {}): Broadcast => ({
  id: `bc-${Date.now()}-${Math.random()}`,
  message: 'Test broadcast message',
  severity: 'info',
  language: 'en',
  createdAt: Date.now(),
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('formatBroadcastTimestamp()', () => {
  it('shows "Just now" for broadcasts less than 1 minute old', () => {
    const result = formatBroadcastTimestamp(Date.now() - 30000); // 30s ago
    expect(result).toBe('Just now');
  });

  it('shows "1 minute ago" for exactly 1 minute', () => {
    const result = formatBroadcastTimestamp(Date.now() - 60000);
    expect(result).toBe('1 minute ago');
  });

  it('shows "X minutes ago" for 2-59 minutes', () => {
    const result = formatBroadcastTimestamp(Date.now() - 5 * 60000);
    expect(result).toBe('5 minutes ago');
  });

  it('shows hours for broadcasts over 60 minutes old', () => {
    const result = formatBroadcastTimestamp(Date.now() - 2 * 60 * 60000);
    expect(result).toBe('2 hours ago');
  });

  it('uses singular "hour" for exactly 1 hour', () => {
    const result = formatBroadcastTimestamp(Date.now() - 1 * 60 * 60000);
    expect(result).toBe('1 hour ago');
  });
});

describe('filterBroadcastsByLanguage()', () => {
  const broadcasts: Broadcast[] = [
    makeBroadcast({ id: '1', language: 'en' }),
    makeBroadcast({ id: '2', language: 'es' }),
    makeBroadcast({ id: '3', language: 'all' }),
    makeBroadcast({ id: '4', language: 'fr' }),
  ];

  it('returns English broadcasts and "all" broadcasts for language "en"', () => {
    const result = filterBroadcastsByLanguage(broadcasts, 'en');
    expect(result).toHaveLength(2);
    expect(result.map((b) => b.id)).toContain('1');
    expect(result.map((b) => b.id)).toContain('3');
  });

  it('returns Spanish broadcasts and "all" broadcasts for language "es"', () => {
    const result = filterBroadcastsByLanguage(broadcasts, 'es');
    expect(result).toHaveLength(2);
    expect(result.map((b) => b.id)).toContain('2');
    expect(result.map((b) => b.id)).toContain('3');
  });

  it('returns only "all" broadcasts for an unsupported language', () => {
    const result = filterBroadcastsByLanguage(broadcasts, 'ja');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });
});

describe('sortBroadcastsByRecency()', () => {
  it('places the most recent broadcast first', () => {
    const broadcasts = [
      makeBroadcast({ id: 'old', createdAt: Date.now() - 10000 }),
      makeBroadcast({ id: 'new', createdAt: Date.now() }),
      makeBroadcast({ id: 'mid', createdAt: Date.now() - 5000 }),
    ];
    const sorted = sortBroadcastsByRecency(broadcasts);
    expect(sorted[0].id).toBe('new');
    expect(sorted[2].id).toBe('old');
  });

  it('does not mutate the original array', () => {
    const original = [
      makeBroadcast({ createdAt: Date.now() - 5000 }),
      makeBroadcast({ createdAt: Date.now() }),
    ];
    const originalFirst = original[0].id;
    sortBroadcastsByRecency(original);
    expect(original[0].id).toBe(originalFirst);
  });
});

describe('getCriticalBroadcasts()', () => {
  it('returns only critical severity broadcasts', () => {
    const broadcasts = [
      makeBroadcast({ severity: 'critical' }),
      makeBroadcast({ severity: 'info' }),
      makeBroadcast({ severity: 'warning' }),
      makeBroadcast({ severity: 'critical' }),
    ];
    const result = getCriticalBroadcasts(broadcasts);
    expect(result).toHaveLength(2);
    result.forEach((b) => expect(b.severity).toBe('critical'));
  });

  it('returns empty array when no critical broadcasts', () => {
    const broadcasts = [
      makeBroadcast({ severity: 'info' }),
      makeBroadcast({ severity: 'warning' }),
    ];
    expect(getCriticalBroadcasts(broadcasts)).toHaveLength(0);
  });
});

describe('validateBroadcastMessage()', () => {
  it('accepts valid non-empty messages', () => {
    const result = validateBroadcastMessage('Gate A is now open for fans.');
    expect(result.valid).toBe(true);
  });

  it('rejects empty messages', () => {
    const result = validateBroadcastMessage('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  it('rejects whitespace-only messages', () => {
    const result = validateBroadcastMessage('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects messages over 500 characters', () => {
    const longMsg = 'A'.repeat(501);
    const result = validateBroadcastMessage(longMsg);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too long/i);
  });

  it('accepts messages of exactly 500 characters', () => {
    const exactly500 = 'A'.repeat(500);
    const result = validateBroadcastMessage(exactly500);
    expect(result.valid).toBe(true);
  });
});
