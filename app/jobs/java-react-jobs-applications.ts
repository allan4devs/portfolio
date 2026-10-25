import type { ApplicationState, AppsMap } from "../(page_routes)/cv/applications";
import type { JobLead } from "./java-react-jobs-types";

/** Resolve source aliases without losing an application submitted under an older record. */
export function resolveJobApplication(job: JobLead, stored: AppsMap, fallback: ApplicationState): ApplicationState {
  const candidates = [job.applicationSlug, ...(job.applicationAliases ?? [])]
    .flatMap((slug) => stored[slug] ? [{ slug, state: stored[slug] }] : [])
    .sort((a, b) => (b.state.updatedOn ?? "").localeCompare(a.state.updatedOn ?? ""));
  const latest: Partial<ApplicationState> | undefined = candidates[0]?.state;
  const history = candidates.find(({ state }) => state.status && state.status !== "draft" || Boolean(state.appliedOn?.trim()))?.state;
  // A saved draft under another alias cannot erase evidence of a submitted application.
  const saved: Partial<ApplicationState> = history && (!latest?.status || latest.status === "draft") ? { ...latest, ...history } : latest ?? {};
  return {
    ...fallback,
    status: job.initialStatus,
    stage: job.nextStep,
    priority: job.initialPriority,
    notes: job.sourceNotes,
    ...saved,
  };
}
