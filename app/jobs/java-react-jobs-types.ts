import type { ApplicationState, ApplicationStatus } from "../(page_routes)/cv/applications";

export type JobLead = {
  id: string;
  applicationSlug: string;
  /** Other application keys retained when source records describe the same posting. */
  applicationAliases?: string[];
  /** Stable identifiers retained from merged source records. */
  sourceIds?: string[];
  company: string;
  title: string;
  location: string;
  url: string;
  postedOn?: string;
  /** Source proving publication date; first/last seen are never publication dates. */
  postedOnSource?: string;
  match: "tailored" | "strong" | "general";
  cvPath?: string;
  cvLabel?: string;
  matchReason: string;
  track: string;
  seniority: string;
  stack: string;
  eligibility: string;
  workMode: string;
  engagement: string;
  sourcePriority: string;
  matchScore?: number;
  locationFit: string;
  contractorSignal: string;
  preferenceExclusion: string;
  userSignal: string;
  sourceStatus: string;
  listingStatus: "open" | "closed" | "unknown";
  firstSeen: string;
  lastSeen: string;
  seenCount?: number;
  nextStep: string;
  recordQuality: string;
  sources: string;
  sourceNotes: string;
  initialStatus: ApplicationStatus;
  initialPriority: number;
  seeded: boolean;
  seen?: boolean;
  /** Deterministic 0-10 fit score from scripts/rate_jobs.py (data/job-ratings.ts). */
  rating10: number;
  ratingReason: string;
};

export type JobLeadPatch = Partial<Pick<JobLead, "company" | "title" | "location" | "url" | "seen">>;
export type JobBoardView = "active" | "archive";
export type StatusFilter = ApplicationStatus | "all";
export type TrackFilter = string | "all";
export type SortMode = "board" | "rating";
/** Minimum rating10 to show; 0 shows every job. */
export type RatingFilter = number;

export type JobRowModel = {
  job: JobLead;
  index: number;
  state: ApplicationState;
  hot: boolean;
  /** Board-only archive decision; original application status and notes stay intact. */
  archiveReason?: string;
  /** HOT eligibility only; these jobs remain browsable in the backlog. */
  hotExclusionReason?: string;
  auditRank?: number;
};

export type JobStats = {
  filled: number;
  matched: number;
  applied: number;
  active: number;
  offers: number;
};
