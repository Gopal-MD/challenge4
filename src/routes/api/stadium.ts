import { createFileRoute } from "@tanstack/react-router";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helper";
import { z } from "zod";

// Zod schemas for input validation
const RouteSchema = z.object({
  start: z.string().max(100),
  destination: z.string().max(100),
  wheelchair: z.boolean().default(false),
  visualAssist: z.boolean().default(false),
  lowSensory: z.boolean().default(false),
});

const TriageSchema = z.object({
  report: z.string().max(2000),
});

/**
 * Handles operations under /api/stadium.
 * Supports:
 * - POST /api/stadium?action=route -> Calculates AI-powered accessible routing.
 * - POST /api/stadium?action=triage -> Triages incidents using AI.
 * - GET /api/stadium?action=density -> Fetches crowd density mock metrics.
 * 
 * Personas: Fans, Organizers, Volunteers, Venue Staff.
 */
export const Route = createFileRoute("/api/stadium")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action");

          // Guard Clause: check action validity
          if (action !== "density") {
            return createErrorResponse("Invalid action parameter for GET request", 400);
          }

          // Return high-fidelity mock crowd density data
          const densityData = {
            stadium: "MetLife Stadium (FIFA WC 2026)",
            zones: [
              { id: "gate-a", name: "Gate A (Concourse)", occupancyPercentage: 84, status: "Critical" },
              { id: "gate-b", name: "Gate B (Entry)", occupancyPercentage: 42, status: "Normal" },
              { id: "section-101", name: "Section 101 (Seats)", occupancyPercentage: 92, status: "Critical" },
              { id: "food-court-west", name: "Food Court West", occupancyPercentage: 65, status: "Warning" },
            ],
            timestamp: new Date().toISOString(),
          };

          return createSuccessResponse(densityData);
        } catch (error: any) {
          return createErrorResponse(error?.message || "Internal server error", 500);
        }
      },

      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action");

          // Guard Clause: action must be provided
          if (!action) {
            return createErrorResponse("Missing action parameter", 400);
          }

          const body = await request.json();

          // Route Calculation Action
          if (action === "route") {
            const validated = RouteSchema.safeParse(body);
            if (!validated.success) {
              return createErrorResponse("Invalid route request body", 400);
            }

            const { calculateRoute } = await import("@/lib/ops.functions");
            // Call the server function helper directly
            const result = await calculateRoute({ data: validated.data });
            return createSuccessResponse(result);
          }

          // Incident Triage Action
          if (action === "triage") {
            const validated = TriageSchema.safeParse(body);
            if (!validated.success) {
              return createErrorResponse("Invalid triage request body", 400);
            }

            const { triageIncident } = await import("@/lib/ops.functions");
            const result = await triageIncident({ data: validated.data });
            return createSuccessResponse(result);
          }

          // Guard Clause: fallthrough for invalid actions
          return createErrorResponse(`Unsupported action: ${action}`, 400);
        } catch (error: any) {
          return createErrorResponse(error?.message || "Internal server error", 500);
        }
      },
    },
  },
});
