import { DEFAULT_REMOTE_LOCATION } from "./java-react-jobs-constants";
import { jobPostingKey } from "./java-react-jobs-helpers";
import type { JobLead } from "./java-react-jobs-types";

const normalized = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(s\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const roleKey = (job: JobLead) => `${normalized(job.company).replace(/\s/g, "")}|${normalized(job.title)}`;
const unique = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))];
const combine = (first: string, second: string) => unique([first, second]).join("\n");

/** Keep original identities and application keys when several sources describe one posting. */
export function mergeJobSources(...sources: readonly JobLead[][]): JobLead[] {
  const result: JobLead[] = [];
  const byPosting = new Map<string, JobLead>();
  const byRole = new Map<string, JobLead[]>();
  for (const job of sources.flat()) {
    const posting = jobPostingKey(job.url);
    const role = roleKey(job);
    // A matching title at two distinct posting URLs can be a different requisition.
    const existing = (posting ? byPosting.get(posting) : undefined)
      ?? byRole.get(role)?.find((candidate) => !posting || !jobPostingKey(candidate.url));
    if (!existing) {
      const added = { ...job, sourceIds: unique([job.id, ...(job.sourceIds ?? [])]), applicationAliases: unique(job.applicationAliases ?? []) };
      result.push(added);
      if (posting) byPosting.set(posting, added);
      byRole.set(role, [...(byRole.get(role) ?? []), added]);
      continue;
    }
    existing.sourceIds = unique([...(existing.sourceIds ?? []), job.id, ...(job.sourceIds ?? [])]);
    existing.applicationAliases = unique([...(existing.applicationAliases ?? []), job.applicationSlug, ...(job.applicationAliases ?? [])]).filter((slug) => slug !== existing.applicationSlug);
    for (const key of ["url", "postedOn", "postedOnSource", "stack", "seniority", "eligibility", "workMode", "engagement", "cvPath", "cvLabel"] as const) {
      if (!existing[key] && job[key]) existing[key] = job[key];
    }
    if (existing.location === DEFAULT_REMOTE_LOCATION && job.location !== DEFAULT_REMOTE_LOCATION) existing.location = job.location;
    if (job.seen) existing.seen = true;
    if (existing.initialStatus === "draft" && job.initialStatus !== "draft") existing.initialStatus = job.initialStatus;
    if (job.listingStatus === "closed" || existing.listingStatus === "unknown") existing.listingStatus = job.listingStatus;
    if (existing.rating10 === 0 && job.rating10 > 0) {
      existing.rating10 = job.rating10;
      existing.ratingReason = job.ratingReason;
    }
    if (!existing.firstSeen || (job.firstSeen && job.firstSeen < existing.firstSeen)) existing.firstSeen = job.firstSeen;
    if (job.lastSeen > existing.lastSeen) existing.lastSeen = job.lastSeen;
    existing.sources = combine(existing.sources, job.sources);
    existing.sourceNotes = combine(existing.sourceNotes, job.sourceNotes);
    const mergedPosting = jobPostingKey(existing.url);
    if (mergedPosting) byPosting.set(mergedPosting, existing);
    const roleMatches = byRole.get(role) ?? [];
    if (!roleMatches.includes(existing)) byRole.set(role, [...roleMatches, existing]);
  }
  return result;
}
