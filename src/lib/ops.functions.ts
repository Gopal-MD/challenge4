import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface RouteStep {
  instruction: string;
  distanceM: number;
  icon: "start" | "turn" | "stairs" | "elevator" | "escalator" | "arrive";
}

export interface RouteResult {
  etaMinutes: number;
  distanceM: number;
  steps: RouteStep[];
  accessibilityNotes: string[];
}

/**
 * Calculates a dynamic, AI-powered accessible route through the stadium.
 * Uses Groq LLaMA 3.3 for intelligent pathfinding based on accessibility constraints.
 * 
 * @param {string} data.start - The starting location (e.g., Gate A).
 * @param {string} data.destination - The destination (e.g., Section 101).
 * @param {boolean} data.wheelchair - Requires step-free access (elevators).
 * @param {boolean} data.visualAssist - Requires high contrast/audio cues.
 * @param {boolean} data.lowSensory - Requires quiet, non-congested corridors.
 * @returns {Promise<RouteResult>} The calculated route steps and ETA.
 */
export const calculateRoute = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    return z.object({
      start: z.string().max(100),
      destination: z.string().max(100),
      wheelchair: z.boolean(),
      visualAssist: z.boolean(),
      lowSensory: z.boolean(),
    }).parse(data);
  })
  .handler(async ({ data }): Promise<RouteResult> => {
    const { start, destination, wheelchair, visualAssist, lowSensory } = data;
    const key = process.env.GROQ_API_KEY;

    // Fallback if no API key
    if (!key) {
      console.info("[calculateRoute] GROQ_API_KEY missing, using deterministic fallback.");
      const base: RouteStep[] = [
        { instruction: `Exit ${start || "your location"} heading east`, distanceM: 40, icon: "start" },
        { instruction: "Follow the main concourse", distanceM: 120, icon: "turn" },
        wheelchair
          ? { instruction: "Take the elevator up 1 level", distanceM: 15, icon: "elevator" }
          : { instruction: "Take the escalator up 1 level", distanceM: 20, icon: "escalator" },
        { instruction: "Turn right past the merchandise stand", distanceM: 60, icon: "turn" },
        {
          instruction: `Arrive at ${destination || "your destination"}`,
          distanceM: 25,
          icon: "arrive",
        },
      ];
      const distanceM = base.reduce((s, x) => s + x.distanceM, 0);
      const paceMps = wheelchair ? 0.9 : 1.35;
      const etaMinutes = Math.max(2, Math.round(distanceM / paceMps / 60));
  
      const notes: string[] = [];
      if (wheelchair) notes.push("Step-free route selected. Elevators prioritized.");
      if (visualAssist) notes.push("Audio guidance & high-contrast signage available along route.");
      if (lowSensory) notes.push("Quiet corridor selected. Avoids Fan Zone and DJ stage.");
      if (!notes.length) notes.push("Standard route — fastest available path.");
  
      return { etaMinutes, distanceM, steps: base, accessibilityNotes: notes };
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          max_tokens: 300,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are the FIFA World Cup 2026 Stadium Navigation Engine, serving Fans, Volunteers, and Venue Staff. " +
                "Generate a step-by-step route mapping starting point to destination under strict accessibility guidelines. " +
                "Redirect traffic away from crowd bottlenecks and coordinate with transport dispatch if needed. " +
                "Respond ONLY with valid JSON matching this schema: " +
                '{"etaMinutes": number, "distanceM": number, "steps": [{"instruction": string, "distanceM": number, "icon": "start"|"turn"|"stairs"|"elevator"|"escalator"|"arrive"}], "accessibilityNotes": [string]}. ' +
                "If wheelchair=true, prioritize elevators and step-free access. If lowSensory=true, suggest quieter corridors. Ensure realistic distances and times."
            },
            {
              role: "user",
              content: `Start: ${start}. Destination: ${destination}. Wheelchair: ${wheelchair}. Visual Assist: ${visualAssist}. Low Sensory: ${lowSensory}.`,
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch route from Groq.");
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? "{}";
      const result = JSON.parse(content) as RouteResult;
      
      // Safety defaults if AI hallucinates
      if (!result.steps || result.steps.length === 0) throw new Error("Invalid format");
      return result;
    } catch (e) {
      console.error("[calculateRoute] AI route generation failed, falling back:", e);
      // Simple fallback on error
      return {
        etaMinutes: 5,
        distanceM: 200,
        steps: [
          { instruction: `Head towards ${destination}`, distanceM: 200, icon: "start" },
          { instruction: `Arrive at ${destination}`, distanceM: 0, icon: "arrive" }
        ],
        accessibilityNotes: ["AI routing unavailable. Standard direct path assumed."]
      };
    }
  });

/**
 * Triages an incident report using AI, falling back to local deterministic rules.
 * @param {string} data.report - The raw text of the incident.
 */
export const triageIncident = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    return z.object({
      report: z.string().max(2000), // Max 2k characters to prevent abuse
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { triageIncidentWithAI } = await import("./ai-gateway.server");
    return triageIncidentWithAI(data.report);
  });

/**
 * Connects fans directly to Groq LLaMA 3.3 for live match questions.
 * @param {string} data.question - The fan's question.
 * @param {string} data.context - Hidden context (venue, live status).
 * @param {string} [data.lang] - The preferred language of the fan.
 */
export const askGroqAssistant = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    return z.object({
      question: z.string().max(500), // Limit question length
      context: z.string().max(1000),
      lang: z.string().max(50).optional(),
    }).parse(data);
  })
  .handler(async ({ data }): Promise<{ answer: string }> => {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      return { answer: "AI assistant unavailable — GROQ_API_KEY not configured." };
    }

    const languageInstruction = data.lang && data.lang !== "English" 
      ? ` Please reply in ${data.lang}.` 
      : "";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 150,
        messages: [
          {
            role: "system",
            content:
              "You are the Official FIFA World Cup 2026 Multilingual Fan & Volunteer Assistant. " +
              "Your persona is a helpful and professional Tournament Ambassador. " +
              "Provide quick, practical operational intelligence support to Fans, Organizers, Volunteers, and Venue Staff. " +
              "Cover questions about match info, navigation, accessibility, crowd density redirection, and transit/transport dispatch. " +
              "Keep answers concise (1-2 sentences) and warm." + languageInstruction,
          },
          {
            role: "user",
            content: `Context: ${data.context}\n\nFan question: ${data.question}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return { answer: "Sorry, I couldn't fetch an answer right now. Please ask a staff member for help." };
    }

    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content?.trim() ?? "I'm not sure — please ask nearby staff.";
    return { answer };
  });
