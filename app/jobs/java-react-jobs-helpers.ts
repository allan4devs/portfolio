import type { ApplicationState } from "../(page_routes)/cv/applications";
import type {
  JobBoardView,
  JobLead,
  JobRowModel,
  JobStats,
  RatingFilter,
  SortMode,
  StatusFilter,
  TrackFilter,
} from "./java-react-jobs-types";

type GetApplication = (job: JobLead) => ApplicationState;

export function isArchivedRow({ job, state, archiveReason }: Pick<JobRowModel, "job" | "state" | "archiveReason">): boolean {
  return Boolean(archiveReason || job.seen) || state.status === "archived";
}

export function isFilledJob(job: JobLead): boolean {
  return Boolean(job.company.trim() || job.title.trim() || job.url.trim());
}

/** Rejected, archived or seen jobs keep their rating but rank below active ones. */
export function isClosedRow({ job, state, archiveReason }: Pick<JobRowModel, "job" | "state" | "archiveReason">): boolean {
  return Boolean(archiveReason) || job.listingStatus === "closed" || Boolean(job.seen) || state.status === "applied" || state.status === "rejected" || state.status === "archived";
}

export function compareByRating(a: JobRowModel, b: JobRowModel): number {
  return Number(isClosedRow(a)) - Number(isClosedRow(b)) || b.job.rating10 - a.job.rating10 || a.index - b.index;
}

export function toJobRows(jobs: JobLead[], getApplication: GetApplication, hotIds: ReadonlySet<string>): JobRowModel[] {
  const pinnedPostingKeys = new Set(
    jobs.filter((job) => hotIds.has(job.id)).map((job) => jobPostingKey(job.url)).filter((key): key is string => Boolean(key)),
  );
  return jobs.map((job, index) => {
    const postingKey = jobPostingKey(job.url);
    return {
      job,
      index,
      state: getApplication(job),
      hot: hotIds.has(job.id) || Boolean(postingKey && pinnedPostingKeys.has(postingKey)),
    };
  });
}

export function jobPostingKey(url: string): string | null {
  const clean = url.trim().toLowerCase().split(/[?#]/)[0].replace(/\/+$/, "");
  if (!clean) return null;
  const linkedIn = /linkedin\.com\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(clean);
  if (linkedIn) return `linkedin:${linkedIn[1]}`;
  return clean.replace(/^https?:\/\/(www\.)?/, "");
}

export function matchesJobFilters(
  { job, state, archiveReason }: JobRowModel,
  {
    query,
    statusFilter,
    trackFilter,
    minRating,
    view,
  }: {
    query: string;
    statusFilter: StatusFilter;
    trackFilter: TrackFilter;
    minRating: RatingFilter;
    view: JobBoardView;
  },
): boolean {
  if ((view === "archive") !== isArchivedRow({ job, state, archiveReason })) return false;
  if (job.rating10 < minRating) return false;
  if (statusFilter !== "all" && state.status !== statusFilter) return false;
  if (trackFilter !== "all" && job.track !== trackFilter) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const haystack = `${job.company} ${job.title} ${job.location} ${job.track} ${job.stack} ${job.eligibility} ${job.engagement} ${job.userSignal} ${job.ratingReason} ${state.stage} ${state.notes}`.toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function selectJobRows({
  rows,
  query,
  statusFilter,
  trackFilter,
  minRating,
  sortMode,
  view,
}: {
  rows: JobRowModel[];
  query: string;
  statusFilter: StatusFilter;
  trackFilter: TrackFilter;
  minRating: RatingFilter;
  sortMode: SortMode;
  view: JobBoardView;
}): JobRowModel[] {
  const selected = rows
    .filter((row) => (view === "archive" || !row.hot) && matchesJobFilters(row, { query, statusFilter, trackFilter, minRating, view }));
  return selected.sort((a, b) => {
    const groupOrder = Number(isClosedRow(a)) - Number(isClosedRow(b));
    if (groupOrder !== 0) return groupOrder;
    return sortMode === "rating" ? compareByRating(a, b) : a.index - b.index;
  });
}

export function calculateJobStats(jobs: JobLead[], getApplication: GetApplication): JobStats {
  const stats: JobStats = { filled: 0, matched: 0, applied: 0, active: 0, offers: 0 };
  for (const job of jobs) {
    if (isFilledJob(job)) stats.filled += 1;
    if (job.match !== "general") stats.matched += 1;
    const status = getApplication(job).status;
    if (status !== "draft" && status !== "archived") stats.applied += 1;
    if (status === "screening" || status === "interviewing" || status === "assessment") stats.active += 1;
    if (status === "offer") stats.offers += 1;
  }
  return stats;
}
