import { createFileRoute } from "@tanstack/react-router";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helper";

/**
 * RESTful endpoint /api/healthz.
 * Returns simple health status conforming to the unified JSON Contract.
 */
export const Route = createFileRoute("/api/healthz")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const health = {
            status: "OK",
            timestamp: new Date().toISOString(),
          };
          
          // Guard clause: simple sanity check
          if (health.status !== "OK") {
            return createErrorResponse("Health check failed", 500);
          }

          return createSuccessResponse(health);
        } catch (error: any) {
          return createErrorResponse(error?.message || "Internal server error", 500);
        }
      },
    },
  },
});
