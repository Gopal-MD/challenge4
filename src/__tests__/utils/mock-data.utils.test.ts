/**
 * @file mock-data.utils.test.ts
 * Unit tests for the stadium mock-data utility functions.
 * Validates zone data integrity, density color helper, and
 * incident data shape.
 */

import { describe, it, expect } from 'vitest';
import {
  densityColor,
  ZONES,
  INITIAL_INCIDENTS,
  DENSITY_HISTORY,
  type DensityLevel,
  type Zone,
  type Incident,
} from '../../lib/mock-data';

// ─── densityColor ─────────────────────────────────────────────────────────────
describe('densityColor()', () => {
  it('returns danger/Congested for "high" level', () => {
    const result = densityColor('high');
    expect(result.bg).toBe('bg-danger');
    expect(result.text).toBe('text-danger');
    expect(result.ring).toBe('ring-danger');
    expect(result.label).toBe('Congested');
  });

  it('returns warning/Moderate for "medium" level', () => {
    const result = densityColor('medium');
    expect(result.bg).toBe('bg-warning');
    expect(result.text).toBe('text-warning');
    expect(result.ring).toBe('ring-warning');
    expect(result.label).toBe('Moderate');
  });

  it('returns success/Clear for "low" level', () => {
    const result = densityColor('low');
    expect(result.bg).toBe('bg-success');
    expect(result.text).toBe('text-success');
    expect(result.ring).toBe('ring-success');
    expect(result.label).toBe('Clear');
  });

  it('returns all four required keys for every level', () => {
    const levels: DensityLevel[] = ['low', 'medium', 'high'];
    for (const level of levels) {
      const result = densityColor(level);
      expect(result).toHaveProperty('bg');
      expect(result).toHaveProperty('ring');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('label');
    }
  });
});

// ─── ZONES data ───────────────────────────────────────────────────────────────
describe('ZONES data', () => {
  it('should have at least 4 zones defined', () => {
    expect(ZONES.length).toBeGreaterThanOrEqual(4);
  });

  it('every zone should have a valid DensityLevel', () => {
    const valid: DensityLevel[] = ['low', 'medium', 'high'];
    for (const zone of ZONES) {
      expect(valid).toContain(zone.level);
    }
  });

  it('every zone occupancy should be 0-100', () => {
    for (const zone of ZONES) {
      expect(zone.occupancy).toBeGreaterThanOrEqual(0);
      expect(zone.occupancy).toBeLessThanOrEqual(100);
    }
  });

  it('every zone capacity should be positive', () => {
    for (const zone of ZONES) {
      expect(zone.capacity).toBeGreaterThan(0);
    }
  });

  it('every zone should have x and y coordinates in range 0-100', () => {
    for (const zone of ZONES) {
      expect(zone.x).toBeGreaterThanOrEqual(0);
      expect(zone.x).toBeLessThanOrEqual(100);
      expect(zone.y).toBeGreaterThanOrEqual(0);
      expect(zone.y).toBeLessThanOrEqual(100);
    }
  });

  it('all zone IDs should be unique', () => {
    const ids = ZONES.map((z: Zone) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('zones with occupancy >= 85 should have level "high"', () => {
    const highOccupancyZones = ZONES.filter((z: Zone) => z.occupancy >= 85);
    for (const zone of highOccupancyZones) {
      expect(zone.level).toBe('high');
    }
  });
});

// ─── INITIAL_INCIDENTS data ──────────────────────────────────────────────────
describe('INITIAL_INCIDENTS data', () => {
  const validStatuses = ['new', 'triaged', 'in-progress', 'resolved'];

  it('should have at least 2 incidents defined', () => {
    expect(INITIAL_INCIDENTS.length).toBeGreaterThanOrEqual(2);
  });

  it('every incident should have a valid status', () => {
    for (const incident of INITIAL_INCIDENTS) {
      expect(validStatuses).toContain(incident.status);
    }
  });

  it('every incident should have required string fields', () => {
    for (const incident of INITIAL_INCIDENTS) {
      expect(typeof incident.id).toBe('string');
      expect(typeof incident.title).toBe('string');
      expect(typeof incident.description).toBe('string');
      expect(typeof incident.location).toBe('string');
      expect(typeof incident.reportedAt).toBe('string');
    }
  });

  it('all incident IDs should be unique', () => {
    const ids = INITIAL_INCIDENTS.map((i: Incident) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reportedAt should be a valid ISO date string', () => {
    for (const incident of INITIAL_INCIDENTS) {
      const date = new Date(incident.reportedAt);
      expect(isNaN(date.getTime())).toBe(false);
    }
  });

  it('triaged/in-progress incidents should have a priority', () => {
    const actionableStatuses = ['triaged', 'in-progress', 'resolved'];
    const actionable = INITIAL_INCIDENTS.filter((i: Incident) =>
      actionableStatuses.includes(i.status)
    );
    for (const incident of actionable) {
      expect(incident.priority).toBeDefined();
    }
  });
});

// ─── DENSITY_HISTORY ─────────────────────────────────────────────────────────
describe('DENSITY_HISTORY data', () => {
  it('should have 12 data points', () => {
    expect(DENSITY_HISTORY.length).toBe(12);
  });

  it('every data point should have gateA, gateB, gateC values', () => {
    for (const point of DENSITY_HISTORY) {
      expect(typeof point.gateA).toBe('number');
      expect(typeof point.gateB).toBe('number');
      expect(typeof point.gateC).toBe('number');
    }
  });

  it('every data point should have a time string', () => {
    for (const point of DENSITY_HISTORY) {
      expect(typeof point.time).toBe('string');
      expect(point.time).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});
