import { describe, it, expect, beforeEach } from 'vitest';
import { useOpsStore } from '@/store/opsStore';
import { INITIAL_INCIDENTS, ZONES, type Incident } from '@/lib/mock-data';

const makeIncident = (overrides: Partial<Incident> = {}): Incident => ({
  id: 'inc-test-1',
  title: 'Test incident',
  description: 'Test description',
  location: 'Gate A',
  reportedAt: new Date().toISOString(),
  status: 'new',
  ...overrides,
});

describe('useOpsStore', () => {
  beforeEach(() => {
    useOpsStore.setState({
      incidents: [...INITIAL_INCIDENTS],
      zones: [...ZONES],
    });
  });

  it('initializes with mock incidents and zones', () => {
    const { incidents, zones } = useOpsStore.getState();
    expect(incidents.length).toBeGreaterThan(0);
    expect(zones.length).toBeGreaterThan(0);
  });

  it('adds incidents to the store', () => {
    const incident = makeIncident({ id: 'inc-new' });
    useOpsStore.getState().addIncident(incident);
    expect(useOpsStore.getState().incidents[0]).toEqual(incident);
  });

  it('updates an incident by id', () => {
    const id = INITIAL_INCIDENTS[0].id;
    useOpsStore.getState().updateIncident(id, { status: 'resolved' });
    const updated = useOpsStore.getState().incidents.find((i) => i.id === id);
    expect(updated?.status).toBe('resolved');
  });

  it('deletes an incident by id', () => {
    const id = INITIAL_INCIDENTS[0].id;
    const before = useOpsStore.getState().incidents.length;
    useOpsStore.getState().deleteIncident(id);
    expect(useOpsStore.getState().incidents).toHaveLength(before - 1);
    expect(useOpsStore.getState().incidents.find((i) => i.id === id)).toBeUndefined();
  });

  it('updates a zone occupancy', () => {
    const zoneId = ZONES[0].id;
    useOpsStore.getState().updateZone(zoneId, { occupancy: 95, level: 'high' });
    const zone = useOpsStore.getState().zones.find((z) => z.id === zoneId);
    expect(zone?.occupancy).toBe(95);
    expect(zone?.level).toBe('high');
  });

  it('replaces all zones via setZones', () => {
    const newZones = [{ ...ZONES[0], occupancy: 10 }];
    useOpsStore.getState().setZones(newZones);
    expect(useOpsStore.getState().zones).toEqual(newZones);
  });
});
