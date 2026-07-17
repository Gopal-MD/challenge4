/**
 * @file navigation.utils.test.ts
 * Unit tests for wayfinding / navigation utility logic.
 * Tests route validation, accessibility flag handling, and path generation.
 */

import { describe, it, expect } from 'vitest';

// ─── Extracted navigation utilities for unit testing ─────────────────────────
// These mirror the logic used by the AI wayfinding system in ops.functions.ts

interface AccessibilityOptions {
  wheelchair?: boolean;
  visualAssist?: boolean;
  lowSensory?: boolean;
}

function buildAccessibilityContext(opts: AccessibilityOptions): string {
  const flags: string[] = [];
  if (opts.wheelchair) flags.push('wheelchair (step-free: use lifts only)');
  if (opts.visualAssist) flags.push('visual assistance (high contrast, audio cues)');
  if (opts.lowSensory) flags.push('low-sensory (avoid loud or crowded areas)');
  return flags.length > 0 ? flags.join(', ') : 'no specific accessibility requirements';
}

function validateRouteInput(start: string, destination: string): { valid: boolean; error?: string } {
  if (!start.trim()) return { valid: false, error: 'Start location is required.' };
  if (!destination.trim()) return { valid: false, error: 'Destination is required.' };
  if (start.trim().toLowerCase() === destination.trim().toLowerCase()) {
    return { valid: false, error: 'Start and destination cannot be the same.' };
  }
  if (start.length > 100) return { valid: false, error: 'Start location is too long.' };
  if (destination.length > 100) return { valid: false, error: 'Destination is too long.' };
  return { valid: true };
}

function formatEtaText(minutes: number): string {
  if (minutes < 1) return 'Less than a minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('buildAccessibilityContext()', () => {
  it('returns "no specific" when no flags are set', () => {
    const result = buildAccessibilityContext({});
    expect(result).toBe('no specific accessibility requirements');
  });

  it('includes wheelchair note when wheelchair is true', () => {
    const result = buildAccessibilityContext({ wheelchair: true });
    expect(result).toContain('wheelchair');
    expect(result).toContain('lifts');
  });

  it('includes visual assist note when visualAssist is true', () => {
    const result = buildAccessibilityContext({ visualAssist: true });
    expect(result).toContain('visual assistance');
    expect(result).toContain('high contrast');
  });

  it('includes low-sensory note when lowSensory is true', () => {
    const result = buildAccessibilityContext({ lowSensory: true });
    expect(result).toContain('low-sensory');
    expect(result).toContain('crowded');
  });

  it('combines all three flags with comma separation', () => {
    const result = buildAccessibilityContext({ wheelchair: true, visualAssist: true, lowSensory: true });
    expect(result).toContain('wheelchair');
    expect(result).toContain('visual assistance');
    expect(result).toContain('low-sensory');
    // Should not be the default "no specific" message
    expect(result).not.toContain('no specific');
  });
});

describe('validateRouteInput()', () => {
  it('returns valid for two different non-empty locations', () => {
    const result = validateRouteInput('Gate A', 'Section 101');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects empty start location', () => {
    const result = validateRouteInput('', 'Section 101');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it('rejects empty destination', () => {
    const result = validateRouteInput('Gate A', '');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it('rejects identical start and destination (case insensitive)', () => {
    const result = validateRouteInput('Gate A', 'gate a');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/same/i);
  });

  it('rejects start location exceeding 100 characters', () => {
    const longString = 'A'.repeat(101);
    const result = validateRouteInput(longString, 'Gate B');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too long/i);
  });

  it('rejects destination exceeding 100 characters', () => {
    const longString = 'B'.repeat(101);
    const result = validateRouteInput('Gate A', longString);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too long/i);
  });

  it('accepts inputs of exactly 100 characters', () => {
    const exactly100 = 'A'.repeat(100);
    const result = validateRouteInput(exactly100, 'Gate B');
    expect(result.valid).toBe(true);
  });
});

describe('formatEtaText()', () => {
  it('returns "Less than a minute" for 0 minutes', () => {
    expect(formatEtaText(0)).toBe('Less than a minute');
  });

  it('returns "1 minute" for exactly 1 minute', () => {
    expect(formatEtaText(1)).toBe('1 minute');
  });

  it('returns plural minutes for values > 1', () => {
    expect(formatEtaText(5)).toBe('5 minutes');
    expect(formatEtaText(12)).toBe('12 minutes');
  });
});

describe('formatDistance()', () => {
  it('shows meters for distances under 1000m', () => {
    expect(formatDistance(250)).toBe('250 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('converts to km for 1000m and above', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(2200)).toBe('2.2 km');
  });
});
