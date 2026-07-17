import { create } from "zustand";
import { INITIAL_INCIDENTS, ZONES, type Incident, type Zone } from "@/lib/mock-data";

interface OpsStore {
  incidents: Incident[];
  zones: Zone[];
  // Incidents
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, patch: Partial<Incident>) => void;
  deleteIncident: (id: string) => void;
  // Zones / crowd
  updateZone: (id: string, patch: Partial<Zone>) => void;
  setZones: (zones: Zone[]) => void;
}

export const useOpsStore = create<OpsStore>()((set) => ({
  incidents: INITIAL_INCIDENTS,
  zones: ZONES,

  addIncident: (incident) =>
    set((state) => ({
      incidents: [incident, ...state.incidents],
    })),

  updateIncident: (id, patch) =>
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === id ? { ...inc, ...patch } : inc
      ),
    })),

  deleteIncident: (id) =>
    set((state) => ({
      incidents: state.incidents.filter((inc) => inc.id !== id),
    })),

  updateZone: (id, patch) =>
    set((state) => ({
      zones: state.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    })),

  setZones: (zones) => set({ zones }),
}));

// Selector helpers
export const useIncidents = () => useOpsStore((state) => state.incidents);
export const useZones = () => useOpsStore((state) => state.zones);
export const useIncidentsByStatus = (status: Incident["status"]) =>
  useOpsStore((state) => state.incidents.filter((i) => i.status === status));
export const useCriticalZones = () =>
  useOpsStore((state) => state.zones.filter((z) => z.level === "high"));
