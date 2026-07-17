import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server functions in ops.functions to isolate API route logic
vi.mock("@/lib/ops.functions", () => ({
  calculateRoute: vi.fn().mockResolvedValue({
    etaMinutes: 10,
    distanceM: 350,
    steps: [{ instruction: "Mock Route step", distanceM: 350, icon: "start" }],
    accessibilityNotes: ["Mock accessibility notes"],
  }),
  triageIncident: vi.fn().mockResolvedValue({
    priority: "High",
    actionPlan: "Mock Dispatch security commander.",
  }),
  askGroqAssistant: vi.fn().mockResolvedValue({
    answer: "Mock AI assistant response.",
  }),
}));

describe("RESTful API routes - JSON Contract & Error Boundaries", () => {
  
  // ─── Healthz / Health check route ──────────────────────────────────────────
  describe("GET /api/healthz", () => {
    it("returns success: true and data: status OK in standard API contract", async () => {
      const { Route } = await import("../../routes/api/healthz");
      const request = new Request("http://localhost/api/healthz");
      
      const response = await Route.options.server!.handlers!.GET!({ request });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        status: "OK",
        timestamp: expect.any(String),
      });
      expect(body.error).toBeNull();
    });
  });

  // ─── System metrics route ──────────────────────────────────────────────────
  describe("GET /api/system", () => {
    it("returns core system status metrics matching contract", async () => {
      const { Route } = await import("../../routes/api/system");
      const request = new Request("http://localhost/api/system");

      const response = await Route.options.server!.handlers!.GET!({ request });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("healthy");
      expect(body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(body.error).toBeNull();
    });
  });

  // ─── Stadium Operations Route ──────────────────────────────────────────────
  describe("GET /api/stadium?action=density", () => {
    it("returns correct crowd density data for FIFA 2026 operations", async () => {
      const { Route } = await import("../../routes/api/stadium");
      const request = new Request("http://localhost/api/stadium?action=density");

      const response = await Route.options.server!.handlers!.GET!({ request });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.stadium).toContain("FIFA WC 2026");
      expect(body.data.zones).toBeInstanceOf(Array);
      expect(body.error).toBeNull();
    });

    it("returns error contract if GET action is invalid", async () => {
      const { Route } = await import("../../routes/api/stadium");
      const request = new Request("http://localhost/api/stadium?action=invalid");

      const response = await Route.options.server!.handlers!.GET!({ request });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(body.error).toContain("Invalid action");
    });
  });

  describe("POST /api/stadium?action=route", () => {
    it("returns route details on valid request payload", async () => {
      const { Route } = await import("../../routes/api/stadium");
      const request = new Request("http://localhost/api/stadium?action=route", {
        method: "POST",
        body: JSON.stringify({
          start: "Gate A",
          destination: "Section 101",
          wheelchair: true,
          visualAssist: false,
          lowSensory: true,
        }),
      });

      const response = await Route.options.server!.handlers!.POST!({ request });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.etaMinutes).toBe(10);
      expect(body.data.steps).toBeInstanceOf(Array);
      expect(body.error).toBeNull();
    });

    it("returns validation error contract on invalid routing body", async () => {
      const { Route } = await import("../../routes/api/stadium");
      const request = new Request("http://localhost/api/stadium?action=route", {
        method: "POST",
        body: JSON.stringify({
          // Missing start/destination
          wheelchair: "not-a-boolean",
        }),
      });

      const response = await Route.options.server!.handlers!.POST!({ request });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(body.error).toBeDefined();
    });
  });

  describe("POST /api/stadium?action=triage", () => {
    it("returns triage result for incident report successfully", async () => {
      const { Route } = await import("../../routes/api/stadium");
      const request = new Request("http://localhost/api/stadium?action=triage", {
        method: "POST",
        body: JSON.stringify({
          report: "Medical incident reported near Gate A",
        }),
      });

      const response = await Route.options.server!.handlers!.POST!({ request });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.priority).toBe("High");
      expect(body.error).toBeNull();
    });
  });

  // ─── GenAI Assistant Route ─────────────────────────────────────────────────
  describe("POST /api/assistant", () => {
    it("returns assistant answer successfully conforming to contract", async () => {
      const { Route } = await import("../../routes/api/assistant");
      const request = new Request("http://localhost/api/assistant", {
        method: "POST",
        body: JSON.stringify({
          question: "Where is the nearest wheelchair elevator?",
          context: "MetLife Stadium, Gate B concourse",
          lang: "English",
        }),
      });

      const response = await Route.options.server!.handlers!.POST!({ request });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.answer).toBe("Mock AI assistant response.");
      expect(body.error).toBeNull();
    });

    it("returns validation error contract on invalid assistant payload", async () => {
      const { Route } = await import("../../routes/api/assistant");
      const request = new Request("http://localhost/api/assistant", {
        method: "POST",
        body: JSON.stringify({
          // Missing question
          context: "Context info",
        }),
      });

      const response = await Route.options.server!.handlers!.POST!({ request });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(body.error).toBeDefined();
    });
  });
});
