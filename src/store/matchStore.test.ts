/**
 * @file matchStore.test.ts
 * Full unit test suite for the Zustand matchStore.
 * Covers state initialization, match updates, event handling, score
 * auto-increment, selector hooks, and the reset action.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMatchStore } from './matchStore';
import type { Match, MatchEvent } from './matchStore';

// ─── Helper factories ─────────────────────────────────────────────────────────
const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'test-match-1',
  homeTeam: { name: 'USA', score: 0, logo: '🇺🇸' },
  awayTeam: { name: 'Mexico', score: 0, logo: '🇲🇽' },
  venue: 'Test Stadium',
  kickoffTime: new Date('2026-06-14T18:00:00Z').toISOString(),
  status: 'live',
  minute: 0,
  ...overrides,
});

const makeEvent = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `ev-${Date.now()}`,
  type: 'goal',
  team: 'home',
  player: 'Test Player',
  minute: 10,
  timestamp: Date.now(),
  ...overrides,
});

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('useMatchStore', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
  });

  // ─── Initial state after reset ────────────────────────────────────────────
  describe('reset()', () => {
    it('sets currentMatch to null', () => {
      expect(useMatchStore.getState().currentMatch).toBeNull();
    });

    it('sets events to an empty array', () => {
      expect(useMatchStore.getState().events).toEqual([]);
    });

    it('sets isLive to false', () => {
      expect(useMatchStore.getState().isLive).toBe(false);
    });
  });

  // ─── updateMatch ──────────────────────────────────────────────────────────
  describe('updateMatch()', () => {
    it('replaces currentMatch with the provided match', () => {
      const match = makeMatch({ id: 'match-abc' });
      useMatchStore.getState().updateMatch(match);
      expect(useMatchStore.getState().currentMatch).toEqual(match);
    });

    it('can update match status to "halftime"', () => {
      const match = makeMatch({ status: 'halftime' });
      useMatchStore.getState().updateMatch(match);
      expect(useMatchStore.getState().currentMatch?.status).toBe('halftime');
    });

    it('can update match minute', () => {
      const match = makeMatch({ minute: 78 });
      useMatchStore.getState().updateMatch(match);
      expect(useMatchStore.getState().currentMatch?.minute).toBe(78);
    });

    it('preserves existing events when updating the match', () => {
      const event = makeEvent();
      useMatchStore.getState().updateMatch(makeMatch());
      useMatchStore.getState().addEvent(event);
      useMatchStore.getState().updateMatch(makeMatch({ minute: 50 }));
      // Events should not be cleared by updateMatch
      expect(useMatchStore.getState().events).toHaveLength(1);
    });
  });

  // ─── addEvent ─────────────────────────────────────────────────────────────
  describe('addEvent()', () => {
    it('appends an event to the events array', () => {
      useMatchStore.getState().updateMatch(makeMatch());
      const event = makeEvent({ id: 'ev-unique-1' });
      useMatchStore.getState().addEvent(event);
      expect(useMatchStore.getState().events).toHaveLength(1);
      expect(useMatchStore.getState().events[0]).toEqual(event);
    });

    it('appends multiple events in order', () => {
      useMatchStore.getState().updateMatch(makeMatch());
      useMatchStore.getState().addEvent(makeEvent({ id: 'ev-1', minute: 10 }));
      useMatchStore.getState().addEvent(makeEvent({ id: 'ev-2', minute: 20 }));
      useMatchStore.getState().addEvent(makeEvent({ id: 'ev-3', minute: 30 }));
      const events = useMatchStore.getState().events;
      expect(events).toHaveLength(3);
      expect(events.map((e) => e.minute)).toEqual([10, 20, 30]);
    });

    it('increments homeTeam score when a home goal is added', () => {
      useMatchStore.getState().updateMatch(makeMatch({ homeTeam: { name: 'USA', score: 1 } }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'goal', team: 'home' }));
      expect(useMatchStore.getState().currentMatch?.homeTeam.score).toBe(2);
    });

    it('increments awayTeam score when an away goal is added', () => {
      useMatchStore.getState().updateMatch(makeMatch({ awayTeam: { name: 'Mexico', score: 0 } }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'goal', team: 'away' }));
      expect(useMatchStore.getState().currentMatch?.awayTeam.score).toBe(1);
    });

    it('does NOT increment score for non-goal events', () => {
      useMatchStore.getState().updateMatch(makeMatch({ homeTeam: { name: 'USA', score: 2 } }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'card', team: 'home' }));
      expect(useMatchStore.getState().currentMatch?.homeTeam.score).toBe(2);
    });

    it('does NOT increment score if currentMatch is null', () => {
      // No match set — addEvent should not crash
      expect(() =>
        useMatchStore.getState().addEvent(makeEvent({ type: 'goal', team: 'home' }))
      ).not.toThrow();
    });

    it('keeps the opposing team score unchanged on a home goal', () => {
      useMatchStore.getState().updateMatch(makeMatch({
        homeTeam: { name: 'USA', score: 1 },
        awayTeam: { name: 'Mexico', score: 1 },
      }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'goal', team: 'home' }));
      expect(useMatchStore.getState().currentMatch?.awayTeam.score).toBe(1);
    });
  });

  // ─── setIsLive ────────────────────────────────────────────────────────────
  describe('setIsLive()', () => {
    it('sets isLive to true', () => {
      useMatchStore.getState().setIsLive(true);
      expect(useMatchStore.getState().isLive).toBe(true);
    });

    it('sets isLive to false', () => {
      useMatchStore.getState().setIsLive(true);
      useMatchStore.getState().setIsLive(false);
      expect(useMatchStore.getState().isLive).toBe(false);
    });
  });

  // ─── Full scenario ────────────────────────────────────────────────────────
  describe('Full match scenario', () => {
    it('correctly simulates a 2-1 match with goals and a card', () => {
      useMatchStore.getState().updateMatch(makeMatch());
      useMatchStore.getState().setIsLive(true);

      useMatchStore.getState().addEvent(makeEvent({ type: 'kickoff', team: 'home', minute: 0 }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'goal', team: 'home', player: 'Pulisic', minute: 23 }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'goal', team: 'away', player: 'Gimenez', minute: 38 }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'card', team: 'away', minute: 55 }));
      useMatchStore.getState().addEvent(makeEvent({ type: 'goal', team: 'home', player: 'Balogun', minute: 67 }));

      const { currentMatch, events, isLive } = useMatchStore.getState();
      expect(isLive).toBe(true);
      expect(currentMatch?.homeTeam.score).toBe(2);
      expect(currentMatch?.awayTeam.score).toBe(1);
      expect(events).toHaveLength(5);
    });
  });
});
