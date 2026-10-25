import { CLOSED_JOB_ID_SET } from "./closed-jobs";

/** Employer application pages confirmed accepting applications on 2026-10-22. */
export const VERIFIED_OPEN_JOB_CHECKED_AT: Readonly<Record<string, string>> = {
  "J0012": "2026-10-22", // ImagineX Consulting, JazzHR
  "J0051": "2026-10-22", // Duplicate record for the same ImagineX posting
  "J0041": "2026-10-22", // Nortal, Greenhouse
  "4465881607": "2026-10-22", // Confiz, Simplicant
  "4469809825": "2026-10-22", // Bluelight Consulting, Lever
};

const OPEN_STATUS_MAX_AGE_DAYS = 14;

/** A stale open check becomes unknown and must be checked again before applying. */
export function isVerifiedOpenJobCurrent(id: string, now = new Date()): boolean {
  const checkedAt = VERIFIED_OPEN_JOB_CHECKED_AT[id];
  if (!checkedAt || CLOSED_JOB_ID_SET.has(id)) return false;
  const ageDays = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.parse(`${checkedAt}T00:00:00Z`)) / 86_400_000);
  return ageDays >= 0 && ageDays <= OPEN_STATUS_MAX_AGE_DAYS;
}
