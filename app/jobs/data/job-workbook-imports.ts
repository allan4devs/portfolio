import type { JobLead } from "../java-react-jobs-types";

// Read-only inventory on 2026-10-24. Compare actual job rows, excluding formatted blanks,
// headings and subtitles, by normalized posting URL or company + role.
export const WORKBOOK_SOURCE_INVENTORY = [
  { workbook: "ALLJOBS.xlsx", sheet: "Master Jobs", jobRows: 213, newJobs: 0 },
  { workbook: "ALLJOBS.xlsx", sheet: "All Search Records", jobRows: 401, newJobs: 0 },
  { workbook: "costa_rica_explicit_software_jobs_2026-09-26.xlsx", sheet: "Jobs", jobRows: 45, newJobs: 0 },
] as const;

// All 659 source rows are already represented in the existing job catalog.
// Keep only previously missing jobs here; duplicate sources must not create extra backlog rows.
export const WORKBOOK_BACKLOG_JOBS: JobLead[] = [];
