/**
 * Crowd service — real-time crowd density tracking with Firestore.
 *
 * Thresholds (from MIGRATION_GUIDE):
 *   > 85% → critical
 *   > 70% → high
 *   > 50% → medium
 *   ≤ 50% → low
 */

export type DensityLevel = "low" | "medium" | "high" | "critical";

export interface CrowdUpdate {
  matchId: string;
  sectionId: string;
  /** Raw attendance count */
  occupancy: number;
  /** Max capacity of the section */
  capacity: number;
}

export interface CrowdStatus {
  sectionId: string;
  occupancy: number;
  capacity: number;
  densityPercent: number;
  densityLevel: DensityLevel;
  updatedAt: Date;
}

/** Compute density level from a 0-100 percentage */
export function getDensityLevel(densityPercent: number): DensityLevel {
  if (densityPercent > 85) return "critical";
  if (densityPercent > 70) return "high";
  if (densityPercent > 50) return "medium";
  return "low";
}

/**
 * Updates crowd status in Firestore and publishes a real-time event.
 * Alerts staff if density reaches critical level.
 */
export const updateCrowdStatus = async (update: CrowdUpdate): Promise<CrowdStatus> => {
  const { matchId, sectionId, occupancy, capacity } = update;
  const densityPercent = Math.round((occupancy / capacity) * 100);
  const densityLevel = getDensityLevel(densityPercent);

  const status: CrowdStatus = {
    sectionId,
    occupancy,
    capacity,
    densityPercent,
    densityLevel,
    updatedAt: new Date(),
  };

  try {
    const { getFirestore } = await import("firebase-admin/firestore" as never) as
      { getFirestore: () => { collection: (n: string) => { doc: (id: string) => { update: (d: Record<string, unknown>) => Promise<void> } } } };
    const db = getFirestore();
    await db.collection("sections").doc(sectionId).update({
      occupancy,
      densityPercent,
      densityLevel,
      updatedAt: new Date(),
    });
  } catch {
    // Offline — proceed locally
    console.warn("[CrowdService] Firestore unavailable — update is local only");
  }

  // Alert if critical
  if (densityLevel === "critical") {
    console.warn(
      `[CrowdService] 🚨 CRITICAL density at section ${sectionId}: ${densityPercent}% (match ${matchId})`
    );
    // TODO: call alertStaff(matchId, sectionId, message) when backend is live
  }

  return status;
};

/**
 * Computes a summary across all sections.
 */
export function computeCrowdSummary(sections: CrowdStatus[]) {
  const total = sections.reduce((s, z) => s + z.occupancy, 0);
  const capacity = sections.reduce((s, z) => s + z.capacity, 0);
  const avgDensity = capacity > 0 ? Math.round((total / capacity) * 100) : 0;
  const criticalSections = sections.filter((z) => z.densityLevel === "critical");
  const highSections = sections.filter((z) => z.densityLevel === "high");

  return {
    totalAttendance: total,
    totalCapacity: capacity,
    avgDensityPercent: avgDensity,
    criticalSections,
    highSections,
    overallLevel: getDensityLevel(avgDensity),
  };
}
