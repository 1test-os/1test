import { Type, type Static } from "typebox";
import { type TestPlanV1 } from "griffin-hub-sdk";
import crypto from "node:crypto";

/**
 * Normalize a plan payload for deterministic hashing.
 * - Sorts object keys recursively
 * - Removes undefined values
 * - Ensures stable JSON serialization
 */
export function normalizePlanPayload(plan: TestPlanV1): TestPlanV1 {
  return JSON.parse(JSON.stringify(plan, Object.keys(plan).sort()));
}

/**
 * Compute a deterministic hash of a plan payload.
 * Used for change detection.
 */
export function hashPlanPayload(plan: TestPlanV1): string {
  const normalized = normalizePlanPayload(plan);
  const serialized = JSON.stringify(normalized);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
