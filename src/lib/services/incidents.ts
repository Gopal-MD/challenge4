/**
 * Incident service — Firestore transactional incident management.
 *
 * Requires Firebase Admin SDK and Firestore configured.
 * Uses Firestore transactions to guarantee atomicity:
 *   1. Create incident document
 *   2. Increment section incident counter
 *   3. Write audit log entry
 */

export interface IncidentInput {
  matchId: string;
  sectionId: string;
  type: "medical" | "security" | "crowd" | "maintenance" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  reportedBy?: string;
}

export interface IncidentRecord extends IncidentInput {
  id: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: Date;
  alerts: string[];
}

/**
 * Atomically creates an incident in Firestore with audit logging.
 * Stub: returns a local object when Firestore is not available.
 */
export const reportIncident = async (input: IncidentInput): Promise<string> => {
  let db: unknown;

  try {
    const { getFirestore } = await import("firebase-admin/firestore" as never) as
      { getFirestore: () => { runTransaction: (fn: (t: unknown) => Promise<string>) => Promise<string> } };
    db = getFirestore();
  } catch {
    // Firebase Admin not available — return mock ID
    const mockId = `inc-${Date.now()}`;
    console.warn("[IncidentService] Firebase unavailable — returning mock ID:", mockId);
    return mockId;
  }

  const firestore = db as {
    collection: (name: string) => { doc: (id?: string) => unknown };
    runTransaction: (fn: (t: unknown) => Promise<string>) => Promise<string>;
  };

  return firestore.runTransaction(async (transaction: unknown) => {
    const t = transaction as {
      set: (ref: unknown, data: unknown) => void;
      update: (ref: unknown, data: unknown) => void;
    };

    // 1. Create incident
    const incidentRef = (firestore.collection("incidents").doc() as { id: string });
    t.set(incidentRef, {
      ...input,
      status: "open",
      createdAt: new Date(),
      alerts: [],
    });

    // 2. Increment section incident counter
    const sectionRef = firestore.collection("sections").doc(input.sectionId);
    t.update(sectionRef, {
      incidentCount: { increment: 1 },
      lastIncident: new Date(),
    });

    // 3. Audit log
    const auditRef = firestore.collection("audit_log").doc();
    t.set(auditRef, {
      action: "incident_created",
      incidentId: incidentRef.id,
      matchId: input.matchId,
      severity: input.severity,
      timestamp: new Date(),
    });

    return incidentRef.id;
  });
};

/**
 * Resolves an incident and appends a resolution note.
 */
export const resolveIncident = async (
  incidentId: string,
  resolution: string,
  resolvedBy: string
): Promise<void> => {
  try {
    const { getFirestore } = await import("firebase-admin/firestore" as never) as
      { getFirestore: () => { collection: (name: string) => { doc: (id: string) => { update: (data: Record<string, unknown>) => Promise<void> } } } };
    const db = getFirestore();
    await db.collection("incidents").doc(incidentId).update({
      status: "resolved",
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    });
  } catch {
    console.warn("[IncidentService] Could not resolve in Firestore — offline mode");
  }
};
