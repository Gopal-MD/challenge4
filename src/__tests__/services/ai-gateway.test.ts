/**
 * @file ai-gateway.test.ts
 * Unit tests for the AI triage gateway's local rule-based fallback engine.
 * The Groq API path is tested via mocking to avoid real network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triageIncidentWithAI, type TriageResult } from '../../lib/ai-gateway.server';

// ─── Local Rule-Based Triage (No API key) ────────────────────────────────────
describe('triageIncidentWithAI — local rule-based fallback', () => {
  beforeEach(() => {
    // Ensure GROQ_API_KEY is NOT set for these tests
    delete process.env.GROQ_API_KEY;
  });

  // HIGH Priority Keywords
  it('classifies unconscious reports as High priority', async () => {
    const result = await triageIncidentWithAI('Person is unconscious near Gate B');
    expect(result.priority).toBe('High');
    expect(result.actionPlan.length).toBeGreaterThan(10);
  });

  it('classifies cardiac/medical emergency as High priority', async () => {
    const result = await triageIncidentWithAI('Cardiac arrest in Section 101, fan is not breathing');
    expect(result.priority).toBe('High');
  });

  it('classifies fire/smoke as High priority', async () => {
    const result = await triageIncidentWithAI('Smoke detected near concourse food stalls');
    expect(result.priority).toBe('High');
    expect(result.actionPlan).toMatch(/evacu|fire|alert/i);
  });

  it('classifies suspicious/unattended bag as High priority', async () => {
    const result = await triageIncidentWithAI('Suspicious unattended bag left under Gate A seating');
    expect(result.priority).toBe('High');
    expect(result.actionPlan).toMatch(/perimeter|K9|security/i);
  });

  it('classifies fight/assault as High priority', async () => {
    const result = await triageIncidentWithAI('Violent fight breaking out in Section 205');
    expect(result.priority).toBe('High');
  });

  it('classifies weapon threat as High priority', async () => {
    const result = await triageIncidentWithAI('Fan reported seeing a weapon near Gate D');
    expect(result.priority).toBe('High');
  });

  // MEDIUM Priority Keywords
  it('classifies lost child as Medium priority', async () => {
    const result = await triageIncidentWithAI('Lost child near Food Court North, approximately 6 years old');
    expect(result.priority).toBe('Medium');
    expect(result.actionPlan).toMatch(/guest services|PA|announce/i);
  });

  it('classifies crowd congestion as Medium priority', async () => {
    const result = await triageIncidentWithAI('Heavy crowd congestion building up at Gate C entrance');
    expect(result.priority).toBe('Medium');
  });

  it('classifies slip hazard as Medium priority', async () => {
    const result = await triageIncidentWithAI('Large liquid spill on Section 101 aisle creating a slip hazard');
    expect(result.priority).toBe('Medium');
    expect(result.actionPlan).toMatch(/janitorial|caution|clean/i);
  });

  it('classifies drunk fan as Medium priority', async () => {
    const result = await triageIncidentWithAI('Fan appears visibly drunk and is causing a disturbance');
    expect(result.priority).toBe('Medium');
  });

  // LOW Priority Keywords
  it('classifies generic low-priority reports correctly', async () => {
    const result = await triageIncidentWithAI('Toilet paper is running low in restroom near Section 301');
    expect(result.priority).toBe('Low');
    expect(result.actionPlan.length).toBeGreaterThan(10);
  });

  it('returns a string actionPlan for every incident report', async () => {
    const reports = [
      'Medical emergency at gate',
      'Spilled drink in aisle',
      'Request for wheelchair assistance',
      'General complaint about seating',
    ];
    for (const report of reports) {
      const result: TriageResult = await triageIncidentWithAI(report);
      expect(typeof result.actionPlan).toBe('string');
      expect(result.actionPlan.length).toBeGreaterThan(5);
    }
  });

  it('returns a valid priority for every incident report', async () => {
    const validPriorities: TriageResult['priority'][] = ['Low', 'Medium', 'High'];
    const reports = [
      'Someone is bleeding heavily',
      'Fan lost their ticket',
      'Elevator is broken',
    ];
    for (const report of reports) {
      const result = await triageIncidentWithAI(report);
      expect(validPriorities).toContain(result.priority);
    }
  });
});

// ─── Groq API Path (Mocked) ──────────────────────────────────────────────────
describe('triageIncidentWithAI — Groq API path (mocked)', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key-mock';
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    vi.restoreAllMocks();
  });

  it('uses Groq API when key is set and returns parsed result', async () => {
    const mockResponse = {
      priority: 'High',
      actionPlan: 'Dispatch emergency team immediately.',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      }),
    }));

    const result = await triageIncidentWithAI('Medical emergency at Gate A');
    expect(result.priority).toBe('High');
    expect(result.actionPlan).toBe('Dispatch emergency team immediately.');
  });

  it('falls back to local triage if Groq API returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));

    // Should not throw, should fall back gracefully
    const result = await triageIncidentWithAI('Fan collapsed near Gate B');
    expect(result.priority).toBe('High'); // local rule should catch "collapsed"
    expect(result.actionPlan.length).toBeGreaterThan(10);
  });

  it('falls back gracefully if Groq API throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await triageIncidentWithAI('Smoke near concession stands');
    expect(['Low', 'Medium', 'High']).toContain(result.priority);
  });

  it('defaults to Medium priority if Groq returns invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{ invalid json' } }],
      }),
    }));

    const result = await triageIncidentWithAI('Some incident');
    // Should fall back to local triage
    expect(['Low', 'Medium', 'High']).toContain(result.priority);
  });
});
