/** Listings confirmed unavailable from their employer application page. */
export const CLOSED_JOB_IDS: readonly string[] = [
  "N0078", // Kubikware Node.js + React - no longer accepting applications (checked 2026-10-22)
  "N0079", // Kubikware Python + Django - no longer accepting applications (checked 2026-10-22)
];

export const CLOSED_JOB_ID_SET: ReadonlySet<string> = new Set(CLOSED_JOB_IDS);
