import { createFileRoute } from "@tanstack/react-router";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helper";

// Record system startup time
const startEpoch = Date.now();

/**
 * RESTful endpoint /api/system.
 * Returns core system metrics and uptime conforming to the unified JSON Contract.
 */
export const Route = createFileRoute("/api/system")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const uptimeSec = Math.floor((Date.now() - startEpoch) / 1000);
          const metrics = {
            status: "healthy",
            uptimeSeconds: uptimeSec,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || "development",
            version: "1.0.0",
          };
          
          // Guard clause: ensure system is operational
          if (!metrics.status) {
            return createErrorResponse("System status is degraded", 503);
          }

          return createSuccessResponse(metrics);
        } catch (error: any) {
          return createErrorResponse(error?.message || "Internal server error", 500);
        }
      },
    },
  },
});
