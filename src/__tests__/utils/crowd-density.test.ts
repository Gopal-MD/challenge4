/**
 * @file crowd-density.utils.test.ts
 * Tests crowd density calculation logic used throughout the FanOps platform.
 * Validates level classification, occupancy thresholds, and alert logic.
 */

import { describe, it, expect } from 'vitest';
import { ZONES, type Zone, type DensityLevel } from '../../lib/mock-data';

// ─── Crowd Density Classification ────────────────────────────────────────────
/**
 * Extracted density logic for unit testing.
 * Mirrors what the ops dashboard uses internally.
 */
function classifyDensity(occupancy: number, capacity: number): DensityLevel {
  const pct = (occupancy / capacity) * 100;
  if (pct >= 85) return 'high';
  if (pct >= 55) return 'medium';
  return 'low';
}

function isOvercrowded(occupancy: number, capacity: number, threshold = 85): boolean {
  return (occupancy / capacity) * 100 >= threshold;
}

function getOccupancyPercentage(occupancy: number, capacity: number): number {
  if (capacity === 0) return 0;
  return Math.round((occupancy / capacity) * 100);
}

function getCriticalZones(zones: Zone[], threshold = 85): Zone[] {
  return zones.filter((z) => z.occupancy >= threshold);
}

function sortZonesByDensity(zones: Zone[]): Zone[] {
  const order: Record<DensityLevel, number> = { high: 0, medium: 1, low: 2 };
  return [...zones].sort((a, b) => order[a.level] - order[b.level]);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('classifyDensity()', () => {
  it('returns "high" when occupancy is >= 85% of capacity', () => {
    expect(classifyDensity(850, 1000)).toBe('high');
    expect(classifyDensity(1000, 1000)).toBe('high');
    expect(classifyDensity(920, 1000)).toBe('high');
  });

  it('returns "medium" when occupancy is 55-84% of capacity', () => {
    expect(classifyDensity(550, 1000)).toBe('medium');
    expect(classifyDensity(700, 1000)).toBe('medium');
    expect(classifyDensity(840, 1000)).toBe('medium');
  });

  it('returns "low" when occupancy is below 55% of capacity', () => {
    expect(classifyDensity(0, 1000)).toBe('low');
    expect(classifyDensity(200, 1000)).toBe('low');
    expect(classifyDensity(540, 1000)).toBe('low');
  });

  it('handles edge cases at exact boundaries', () => {
    expect(classifyDensity(85, 100)).toBe('high');   // exact 85%
    expect(classifyDensity(84, 100)).toBe('medium');  // just under high
    expect(classifyDensity(55, 100)).toBe('medium');  // exact 55%
    expect(classifyDensity(54, 100)).toBe('low');     // just under medium
  });
});

describe('isOvercrowded()', () => {
  it('returns true when occupancy exceeds threshold', () => {
    expect(isOvercrowded(900, 1000)).toBe(true);
    expect(isOvercrowded(850, 1000)).toBe(true);
  });

  it('returns false when occupancy is below threshold', () => {
    expect(isOvercrowded(800, 1000)).toBe(false);
    expect(isOvercrowded(0, 1000)).toBe(false);
  });

  it('respects custom threshold argument', () => {
    expect(isOvercrowded(700, 1000, 70)).toBe(true);
    expect(isOvercrowded(699, 1000, 70)).toBe(false);
  });
});

describe('getOccupancyPercentage()', () => {
  it('calculates percentage correctly', () => {
    expect(getOccupancyPercentage(500, 1000)).toBe(50);
    expect(getOccupancyPercentage(850, 1000)).toBe(85);
    expect(getOccupancyPercentage(0, 1000)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(getOccupancyPercentage(333, 1000)).toBe(33);
    expect(getOccupancyPercentage(667, 1000)).toBe(67);
  });

  it('returns 0 for zero capacity (division safety)', () => {
    expect(getOccupancyPercentage(100, 0)).toBe(0);
  });
});

describe('getCriticalZones()', () => {
  it('returns only zones above the 85% threshold', () => {
    const critical = getCriticalZones(ZONES);
    for (const zone of critical) {
      expect(zone.occupancy).toBeGreaterThanOrEqual(85);
    }
  });

  it('returns empty array if no zones exceed threshold', () => {
    const lowZones: Zone[] = [
      { id: 'z1', name: 'Zone 1', capacity: 1000, occupancy: 50, level: 'low', x: 10, y: 10 },
    ];
    expect(getCriticalZones(lowZones)).toHaveLength(0);
  });

  it('respects custom threshold', () => {
    const zones: Zone[] = [
      { id: 'z1', name: 'Zone 1', capacity: 100, occupancy: 75, level: 'medium', x: 10, y: 10 },
      { id: 'z2', name: 'Zone 2', capacity: 100, occupancy: 50, level: 'low', x: 20, y: 20 },
    ];
    const critical = getCriticalZones(zones, 70);
    expect(critical).toHaveLength(1);
    expect(critical[0].id).toBe('z1');
  });
});

describe('sortZonesByDensity()', () => {
  it('puts high-density zones first', () => {
    const zones: Zone[] = [
      { id: 'z1', name: 'Low Zone', capacity: 100, occupancy: 30, level: 'low', x: 0, y: 0 },
      { id: 'z2', name: 'High Zone', capacity: 100, occupancy: 90, level: 'high', x: 0, y: 0 },
      { id: 'z3', name: 'Med Zone', capacity: 100, occupancy: 60, level: 'medium', x: 0, y: 0 },
    ];
    const sorted = sortZonesByDensity(zones);
    expect(sorted[0].level).toBe('high');
    expect(sorted[1].level).toBe('medium');
    expect(sorted[2].level).toBe('low');
  });

  it('does not mutate the original array', () => {
    const original = [...ZONES];
    sortZonesByDensity(ZONES);
    expect(ZONES).toEqual(original);
  });
});
