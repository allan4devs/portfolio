import { DEFAULT_REMOTE_LOCATION, JOBS_STORAGE_KEY } from "./java-react-jobs-constants";
import type { JobLead } from "./java-react-jobs-types";

const editableKeys = ["company", "title", "location", "url"] as const;

export function readStoredJobs(defaults: JobLead[]): JobLead[] {
  try {
    const raw = window.localStorage.getItem(JOBS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaults;

    const savedById = new Map<string, Partial<JobLead>>();
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Partial<JobLead>;
      if (typeof candidate.id === "string") savedById.set(candidate.id, candidate);
    }

    return defaults.map((fallback) => {
      const candidates = [...new Set([fallback.id, ...(fallback.sourceIds ?? [])])]
        .flatMap((id) => savedById.has(id) ? [savedById.get(id)!] : []);
      if (!candidates.length) return fallback;
      const restored = { ...fallback };
      for (const key of editableKeys) {
        const saved = candidates.find((entry) => typeof entry[key] === "string" && entry[key]!.trim()
          && (key !== "location" || entry[key] !== DEFAULT_REMOTE_LOCATION));
        if (saved && typeof saved[key] === "string") restored[key] = saved[key];
      }
      if (candidates.some((entry) => entry.seen === true)) restored.seen = true;
      else if (candidates.some((entry) => entry.seen === false)) restored.seen = false;
      return restored;
    });
  } catch {
    return defaults;
  }
}

export function writeStoredJobs(jobs: JobLead[]): void {
  try {
    const editable = jobs.map((job) => ({
      id: job.id,
      company: job.company,
      title: job.title,
      location: job.location,
      url: job.url,
      seen: job.seen,
    }));
    window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(editable));
  } catch {
    /* localStorage unavailable or full */
  }
}
