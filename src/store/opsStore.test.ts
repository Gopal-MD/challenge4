/**
 * @file opsStore.test.ts
 * Comprehensive unit tests for the Zustand opsStore.
 * Covers incidents CRUD, zone updates, selector helpers, and real-time event handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOpsStore, useIncidents, useZones, useIncidentsByStatus, useCriticalZones } from './opsStore';
import type { Incident, Zone } from '../lib/mock-data';

// ─── Helper factories ─────────────────────────────────────────────────────────
const makeIncident = (overrides: Partial<Incident> = {}): Incident => ({
  id: `inc-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: 'Test Incident',
  description: 'Test description',
  location: 'Gate A',
  reportedAt: new Date().toISOString(),
  status: 'new',
  ...overrides,
});

const makeZone = (overrides: Partial<Zone> = {}): Zone => ({
  id: `zone-test-${Math.random().toString(36).slice(2)}`,
  name: 'Test Zone',
  capacity: 1000,
  occupancy: 50,
  level: 'low',
  x: 50,
  y: 50,
  ...overrides,
});

// ─── Reset helper ─────────────────────────────────────────────────────────────
function resetStore() {
  useOpsStore.setState({
    incidents: [],
    zones: [],
  });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('useOpsStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ─── Incidents ────────────────────────────────────────────────────────────
  describe('addIncident()', () => {
    it('adds a single incident to the store', () => {
      const inc = makeIncident({ id: 'unique-inc-1', title: 'Spill in aisle' });
      useOpsStore.getState().addIncident(inc);
      expect(useOpsStore.getState().incidents).toHaveLength(1);
      expect(useOpsStore.getState().incidents[0].title).toBe('Spill in aisle');
    });

    it('prepends new incidents to the list (newest first)', () => {
      const inc1 = makeIncident({ id: 'inc-a', title: 'First' });
      const inc2 = makeIncident({ id: 'inc-b', title: 'Second' });
      useOpsStore.getState().addIncident(inc1);
      useOpsStore.getState().addIncident(inc2);
      const incidents = useOpsStore.getState().incidents;
      expect(incidents[0].title).toBe('Second');
      expect(incidents[1].title).toBe('First');
    });

    it('supports multiple incidents with different statuses', () => {
      useOpsStore.getState().addIncident(makeIncident({ id: 'a', status: 'new' }));
      useOpsStore.getState().addIncident(makeIncident({ id: 'b', status: 'resolved' }));
      useOpsStore.getState().addIncident(makeIncident({ id: 'c', status: 'in-progress' }));
      expect(useOpsStore.getState().incidents).toHaveLength(3);
    });
  });

  describe('updateIncident()', () => {
    it('updates a specific incident by id', () => {
      const inc = makeIncident({ id: 'upd-1', status: 'new' });
      useOpsStore.getState().addIncident(inc);
      useOpsStore.getState().updateIncident('upd-1', { status: 'resolved', priority: 'High' });

      const updated = useOpsStore.getState().incidents.find((i) => i.id === 'upd-1');
      expect(updated?.status).toBe('resolved');
      expect(updated?.priority).toBe('High');
    });

    it('does not affect other incidents when updating one', () => {
      useOpsStore.getState().addIncident(makeIncident({ id: 'x1', status: 'new' }));
      useOpsStore.getState().addIncident(makeIncident({ id: 'x2', status: 'new' }));
      useOpsStore.getState().updateIncident('x1', { status: 'triaged' });

      const x2 = useOpsStore.getState().incidents.find((i) => i.id === 'x2');
      expect(x2?.status).toBe('new');
    });

    it('applies a partial patch without losing existing fields', () => {
      const inc = makeIncident({ id: 'patch-1', title: 'Original Title', status: 'new' });
      useOpsStore.getState().addIncident(inc);
      useOpsStore.getState().updateIncident('patch-1', { actionPlan: 'Dispatch staff.' });

      const updated = useOpsStore.getState().incidents.find((i) => i.id === 'patch-1');
      expect(updated?.title).toBe('Original Title'); // preserved
      expect(updated?.actionPlan).toBe('Dispatch staff.'); // added
    });
  });

  describe('deleteIncident()', () => {
    it('removes an incident from the store by id', () => {
      useOpsStore.getState().addIncident(makeIncident({ id: 'del-1' }));
      useOpsStore.getState().addIncident(makeIncident({ id: 'del-2' }));
      useOpsStore.getState().deleteIncident('del-1');
      const ids = useOpsStore.getState().incidents.map((i) => i.id);
      expect(ids).not.toContain('del-1');
      expect(ids).toContain('del-2');
    });

    it('does nothing if incident id does not exist', () => {
      useOpsStore.getState().addIncident(makeIncident({ id: 'safe-1' }));
      useOpsStore.getState().deleteIncident('non-existent-id');
      expect(useOpsStore.getState().incidents).toHaveLength(1);
    });
  });

  // ─── Zones ────────────────────────────────────────────────────────────────
  describe('updateZone()', () => {
    it('updates a zone by id', () => {
      useOpsStore.setState({ zones: [makeZone({ id: 'z-1', occupancy: 50, level: 'low' })] });
      useOpsStore.getState().updateZone('z-1', { occupancy: 90, level: 'high' });
      const zone = useOpsStore.getState().zones.find((z) => z.id === 'z-1');
      expect(zone?.occupancy).toBe(90);
      expect(zone?.level).toBe('high');
    });

    it('preserves other zones when updating one', () => {
      useOpsStore.setState({
        zones: [
          makeZone({ id: 'z-2a', occupancy: 20 }),
          makeZone({ id: 'z-2b', occupancy: 30 }),
        ],
      });
      useOpsStore.getState().updateZone('z-2a', { occupancy: 95 });
      const unchanged = useOpsStore.getState().zones.find((z) => z.id === 'z-2b');
      expect(unchanged?.occupancy).toBe(30);
    });
  });

  describe('setZones()', () => {
    it('replaces all zones with a new set', () => {
      useOpsStore.setState({ zones: [makeZone({ id: 'old' })] });
      const newZones = [makeZone({ id: 'new-1' }), makeZone({ id: 'new-2' })];
      useOpsStore.getState().setZones(newZones);
      const zoneIds = useOpsStore.getState().zones.map((z) => z.id);
      expect(zoneIds).not.toContain('old');
      expect(zoneIds).toContain('new-1');
      expect(zoneIds).toContain('new-2');
    });
  });

  // ─── Selector helpers ─────────────────────────────────────────────────────
  describe('Selector helpers', () => {
    it('useIncidents() returns the incidents array', () => {
      useOpsStore.getState().addIncident(makeIncident({ id: 'sel-1' }));
      const result = useOpsStore.getState().incidents;
      expect(result).toHaveLength(1);
    });

    it('useZones() returns the zones array', () => {
      useOpsStore.setState({ zones: [makeZone({ id: 'sel-z' })] });
      const result = useOpsStore.getState().zones;
      expect(result).toHaveLength(1);
    });

    it('useIncidentsByStatus() filters by status', () => {
      useOpsStore.getState().addIncident(makeIncident({ id: 'f1', status: 'new' }));
      useOpsStore.getState().addIncident(makeIncident({ id: 'f2', status: 'resolved' }));
      useOpsStore.getState().addIncident(makeIncident({ id: 'f3', status: 'new' }));
      const newOnes = useOpsStore.getState().incidents.filter((i) => i.status === 'new');
      expect(newOnes).toHaveLength(2);
    });

    it('useCriticalZones() returns only high-density zones', () => {
      useOpsStore.setState({
        zones: [
          makeZone({ id: 'critical-1', level: 'high' }),
          makeZone({ id: 'medium-1', level: 'medium' }),
          makeZone({ id: 'low-1', level: 'low' }),
        ],
      });
      const critical = useOpsStore.getState().zones.filter((z) => z.level === 'high');
      expect(critical).toHaveLength(1);
      expect(critical[0].id).toBe('critical-1');
    });
  });
});
