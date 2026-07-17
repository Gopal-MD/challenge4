import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface MatchTeam {
  name: string;
  score: number;
  logo?: string;
}

export interface MatchEvent {
  id: string;
  type: "goal" | "card" | "substitution" | "kickoff" | "halftime" | "fulltime";
  team: "home" | "away";
  player?: string;
  minute: number;
  timestamp: number;
}

export interface Match {
  id: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  venue: string;
  kickoffTime: string;
  status: "upcoming" | "live" | "halftime" | "fulltime";
  minute?: number;
}

interface MatchStore {
  currentMatch: Match | null;
  events: MatchEvent[];
  isLive: boolean;
  updateMatch: (match: Match) => void;
  addEvent: (event: MatchEvent) => void;
  setIsLive: (live: boolean) => void;
  reset: () => void;
}

// Default mock match for demonstration
const DEFAULT_MATCH: Match = {
  id: "match-wc-01",
  homeTeam: { name: "USA", score: 2, logo: "🇺🇸" },
  awayTeam: { name: "Mexico", score: 1, logo: "🇲🇽" },
  venue: "MetLife Stadium",
  kickoffTime: new Date().toISOString(),
  status: "live",
  minute: 67,
};

const DEFAULT_EVENTS: MatchEvent[] = [
  { id: "ev-1", type: "kickoff", team: "home", minute: 0, timestamp: Date.now() - 67 * 60000 },
  { id: "ev-2", type: "goal", team: "home", player: "Christian Pulisic", minute: 23, timestamp: Date.now() - 44 * 60000 },
  { id: "ev-3", type: "goal", team: "away", player: "Santiago Giménez", minute: 38, timestamp: Date.now() - 29 * 60000 },
  { id: "ev-4", type: "halftime", team: "home", minute: 45, timestamp: Date.now() - 22 * 60000 },
  { id: "ev-5", type: "goal", team: "home", player: "Folarin Balogun", minute: 55, timestamp: Date.now() - 12 * 60000 },
  { id: "ev-6", type: "card", team: "away", player: "Edson Álvarez", minute: 62, timestamp: Date.now() - 5 * 60000 },
];

export const useMatchStore = create<MatchStore>()(
  subscribeWithSelector((set) => ({
    currentMatch: DEFAULT_MATCH,
    events: DEFAULT_EVENTS,
    isLive: true,

    updateMatch: (match) => set({ currentMatch: match }),

    addEvent: (event) =>
      set((state) => ({
        events: [...state.events, event],
        // Auto-increment score on goal
        currentMatch:
          event.type === "goal" && state.currentMatch
            ? {
                ...state.currentMatch,
                [event.team === "home" ? "homeTeam" : "awayTeam"]: {
                  ...state.currentMatch[event.team === "home" ? "homeTeam" : "awayTeam"],
                  score:
                    state.currentMatch[event.team === "home" ? "homeTeam" : "awayTeam"].score + 1,
                },
              }
            : state.currentMatch,
      })),

    setIsLive: (live) => set({ isLive: live }),

    reset: () =>
      set({
        currentMatch: null,
        events: [],
        isLive: false,
      }),
  }))
);

// Selector hooks for performance (avoid re-render if unrelated state changes)
export const useCurrentMatch = () => useMatchStore((state) => state.currentMatch);
export const useMatchEvents = () => useMatchStore((state) => state.events);
export const useIsLive = () => useMatchStore((state) => state.isLive);
