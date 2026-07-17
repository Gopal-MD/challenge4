export type DensityLevel = "low" | "medium" | "high";

export interface Zone {
  id: string;
  name: string;
  capacity: number;
  occupancy: number; // 0-100
  level: DensityLevel;
  x: number; // % on map
  y: number;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  location: string;
  reportedAt: string;
  status: "new" | "triaged" | "in-progress" | "resolved";
  priority?: "Low" | "Medium" | "High";
  actionPlan?: string;
}

export interface Broadcast {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical";
  language: string;
  createdAt: number;
}

export const ZONES: Zone[] = [
  { id: "gA", name: "Gate A", capacity: 5000, occupancy: 42, level: "low", x: 15, y: 25 },
  { id: "gB", name: "Gate B", capacity: 5000, occupancy: 87, level: "high", x: 82, y: 22 },
  { id: "gC", name: "Gate C", capacity: 5000, occupancy: 64, level: "medium", x: 82, y: 78 },
  { id: "gD", name: "Gate D", capacity: 5000, occupancy: 31, level: "low", x: 15, y: 78 },
  { id: "s101", name: "Section 101", capacity: 1200, occupancy: 74, level: "medium", x: 35, y: 45 },
  { id: "s205", name: "Section 205", capacity: 1200, occupancy: 92, level: "high", x: 65, y: 45 },
  { id: "food", name: "Food Court North", capacity: 800, occupancy: 58, level: "medium", x: 50, y: 15 },
  { id: "conc", name: "Concourse East", capacity: 2000, occupancy: 71, level: "medium", x: 70, y: 60 },
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: "inc-1",
    title: "Medical emergency at Gate C",
    description: "Fan collapsed near turnstile 3, appears unconscious. First aid en route.",
    location: "Gate C",
    reportedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    status: "new",
  },
  {
    id: "inc-2",
    title: "Spilled drinks blocking aisle",
    description: "Section 205 row K aisle has slippery spill, cleanup requested.",
    location: "Section 205",
    reportedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: "triaged",
    priority: "Low",
    actionPlan: "Dispatch janitorial to Section 205 row K. Place caution signage within 5 minutes.",
  },
  {
    id: "inc-3",
    title: "Suspicious unattended bag",
    description: "Black backpack left near Concourse East pillar 7 for 20+ minutes.",
    location: "Concourse East",
    reportedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    status: "in-progress",
    priority: "High",
    actionPlan: "Secure 15m perimeter. Alert K9 unit and security lead. Verify with adjacent cameras.",
  },
  {
    id: "inc-4",
    title: "Lost child reported",
    description: "6yo child separated from family near Food Court North.",
    location: "Food Court North",
    reportedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    status: "resolved",
    priority: "Medium",
    actionPlan: "Escort to guest services. Announce over PA (English + Spanish). Reunite with guardian.",
  },
];

export const DENSITY_HISTORY = Array.from({ length: 12 }).map((_, i) => ({
  time: `${String(14 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
  gateA: 20 + Math.round(Math.sin(i / 2) * 15 + Math.random() * 10) + i * 2,
  gateB: 30 + Math.round(Math.cos(i / 3) * 20 + Math.random() * 12) + i * 4,
  gateC: 25 + Math.round(Math.sin(i / 4) * 12 + Math.random() * 8) + i * 3,
}));

export function densityColor(level: DensityLevel) {
  return level === "high"
    ? { bg: "bg-danger", ring: "ring-danger", text: "text-danger", label: "Congested" }
    : level === "medium"
      ? { bg: "bg-warning", ring: "ring-warning", text: "text-warning", label: "Moderate" }
      : { bg: "bg-success", ring: "ring-success", text: "text-success", label: "Clear" };
}
