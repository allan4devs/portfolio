import { HOT_JOB_IDS } from "./data/hot-jobs";
import { HOT_DISMISSED_STORAGE_KEY, HOT_LIMIT, HOT_ROTATED_STORAGE_KEY, HOT_STORAGE_KEY } from "./java-react-jobs-constants";
import { isArchivedRow, jobPostingKey } from "./java-react-jobs-helpers";
import type { JobRowModel } from "./java-react-jobs-types";
import { compareAuditCandidates, hasApplicationHistory, isOctober2026Posting, jobCompanyKey, MIN_JOB_FIT } from "./java-react-jobs-audit";

export function isHotCandidate(row: Pick<JobRowModel, "job" | "state" | "archiveReason" | "hotExclusionReason">): boolean {
  return !row.hotExclusionReason && !isArchivedRow(row) && !hasApplicationHistory(row) && row.job.rating10 >= MIN_JOB_FIT
    && isOctober2026Posting(row.job) && row.job.listingStatus !== "closed"
    && Boolean(jobCompanyKey(row.job.company)) && Boolean(jobPostingKey(row.job.url));
}

/** Use the same fit/publication ranking as the audited shortlist. */
export function compareHotCandidates(a: JobRowModel, b: JobRowModel): number {
  return compareAuditCandidates(a, b);
}

/** Rank the full backlog; rotation history only affects HOT, never archive membership. */
export function rankHotCandidates(rows: JobRowModel[], preferredIds: string[], dismissedIds: string[], rotatedIds: string[] = []): string[] {
  const dismissed = new Set([...dismissedIds, ...rotatedIds]);
  const blockedPostings = new Set(rows
    .filter((row) => hasApplicationHistory(row) || dismissed.has(row.job.id))
    .map((row) => jobPostingKey(row.job.url)));
  const blockedCompanies = new Set(rows
    .filter((row) => hasApplicationHistory(row) || dismissed.has(row.job.id))
    .map((row) => jobCompanyKey(row.job.company)));
  const byId = new Map(rows.map((row) => [row.job.id, row]));
  const eligible = rows.filter((row) => isHotCandidate(row));
  const candidates = [
    ...preferredIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []),
    ...eligible.sort(compareHotCandidates),
  ];
  const selected: string[] = [];
  const selectedPostings = new Set<string>();
  const selectedCompanies = new Set<string>();
  for (const row of candidates) {
    const key = jobPostingKey(row.job.url);
    const company = jobCompanyKey(row.job.company);
    if (!key || !isHotCandidate(row) || blockedPostings.has(key) || selectedPostings.has(key)
      || blockedCompanies.has(company) || selectedCompanies.has(company)) continue;
    selected.push(row.job.id);
    selectedPostings.add(key);
    selectedCompanies.add(company);
  }
  return selected;
}

/** Up to eight genuinely new October postings, one per company. */
export function selectHotIds(rows: JobRowModel[], preferredIds: string[], dismissedIds: string[], rotatedIds: string[] = []): string[] {
  return rankHotCandidates(rows, preferredIds, dismissedIds, rotatedIds).slice(0, HOT_LIMIT);
}

/** Browser override of the committed HOT seed; null means "use data/hot-jobs.ts". */
export function loadHotIds(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return [...new Set(parsed.filter((id): id is string => typeof id === "string"))].slice(0, HOT_LIMIT);
  } catch {
    return null;
  }
}

export function saveHotIds(ids: string[] | null): void {
  if (typeof window === "undefined") return;
  try {
    if (ids === null) window.localStorage.removeItem(HOT_STORAGE_KEY);
    else {
      const safeIds = [...new Set(ids)].slice(0, HOT_LIMIT);
      window.localStorage.setItem(HOT_STORAGE_KEY, JSON.stringify(safeIds));
    }
  } catch {
    /* quota / disabled — ignore */
  }
}

export function seedHotIds(): string[] {
  return [...new Set(HOT_JOB_IDS)].slice(0, HOT_LIMIT);
}

export function loadDismissedHotIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(HOT_DISMISSED_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === "string"))] : [];
  } catch {
    return [];
  }
}

export function saveDismissedHotIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOT_DISMISSED_STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* localStorage unavailable or full */
  }
}

export function loadRotatedHotIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(HOT_ROTATED_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === "string"))] : [];
  } catch {
    return [];
  }
}

export function saveRotatedHotIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOT_ROTATED_STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* localStorage unavailable or full */
  }
}

/** Paste-ready replacement for data/hot-jobs.ts. */
export function formatHotIds(ids: string[], labels: Map<string, string>): string {
  const body = ids.map((id) => `  ${JSON.stringify(id)},${labels.has(id) ? ` // ${labels.get(id)}` : ""}`).join("\n");
  return `export const HOT_JOB_IDS: readonly string[] = [\n${body}\n];\n`;
}
