import { createFileRoute } from "@tanstack/react-router";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helper";
import { z } from "zod";

const AssistantSchema = z.object({
  question: z.string().max(500),
  context: z.string().max(1000),
  lang: z.string().max(50).default("English"),
});

/**
 * Handles operations under /api/assistant.
 * Supports:
 * - POST /api/assistant -> Asks the Groq GenAI assistant with contextual data.
 * 
 * Personas: Fans, Volunteers.
 */
export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const validated = AssistantSchema.safeParse(body);

          // Guard Clause: input validation
          if (!validated.success) {
            return createErrorResponse("Invalid assistant request payload", 400);
          }

          const { askGroqAssistant } = await import("@/lib/ops.functions");
          const result = await askGroqAssistant({ data: validated.data });

          return createSuccessResponse(result);
        } catch (error: any) {
          return createErrorResponse(error?.message || "Internal server error", 500);
        }
      },
    },
  },
});
