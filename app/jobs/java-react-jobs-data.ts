import companyResearch from "./data/latam-company-research.json";
import { JAVA_REACT_CAMPAIGN_JOBS } from "./data/cv-campaign-java-react";
import { JOB_SEARCH_RECORDS, type JobSearchRecord } from "./data/job-search-records";
import { NEW_JOB_SEARCH_RECORDS } from "./data/job-search-new";
import { OCTOBER_2026_JOB_SEARCH_RECORDS } from "./data/job-search-october-2026";
import { JOB_RATINGS } from "./data/job-ratings";
import { CLOSED_JOB_ID_SET } from "./data/closed-jobs";
import { isVerifiedOpenJobCurrent } from "./data/open-jobs";
import { RESEARCHED_JOBS, type ResearchedJob } from "./java-react-jobs-researched";
import { DEFAULT_REMOTE_LOCATION } from "./java-react-jobs-constants";
import type { ApplicationStatus } from "./applications";
import type { JobLead } from "./java-react-jobs-types";

type CvMatch = Pick<JobLead, "cvPath" | "cvLabel" | "match" | "matchReason"> & {
  applicationSlug?: string;
};

const campaignJobs = Object.values(JAVA_REACT_CAMPAIGN_JOBS);
const ALL_JOB_SEARCH_RECORDS: readonly JobSearchRecord[] = [...JOB_SEARCH_RECORDS, ...NEW_JOB_SEARCH_RECORDS, ...OCTOBER_2026_JOB_SEARCH_RECORDS];

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function campaignMatch(job: JobSearchRecord): CvMatch | undefined {
  const company = normalized(job.company);
  const url = job.url.replace(/\/$/, "");
  const campaign = campaignJobs.find((candidate) => {
    const sameUrl = Boolean(url) && candidate.jobUrl.replace(/\/$/, "") === url;
    const candidateCompany = normalized(candidate.company);
    const sameCompany =
      company === candidateCompany || company.includes(candidateCompany) || candidateCompany.includes(company);
    return sameUrl || sameCompany;
  });
  if (!campaign) return undefined;
  return {
    applicationSlug: `java-react-2026/${campaign.key}`,
    cvPath: `/cv/archive/java-react-2026/${campaign.key}`,
    cvLabel: campaign.company,
    match: "tailored",
    matchReason: "Company-specific CV already exists.",
  };
}

function generalCvMatch(job: JobSearchRecord): CvMatch {
  const text = normalized(`${job.track} ${job.title} ${job.stack}`);
  if (/\b(ai|agent|agentic|llm|langchain|langgraph|openai|machine learning)\b/.test(text)) {
    return { cvPath: "/cv/archive/agentic-ai", cvLabel: "Agentic AI", match: "strong", matchReason: "AI and agentic engineering emphasis." };
  }
  if (/\b(c#|dotnet|asp net|net 8|azure)\b/.test(text) || job.track.startsWith(".NET")) {
    return { cvPath: "/cv/archive/python-dotnet", cvLabel: "Python + .NET", match: "strong", matchReason: ".NET, C# or Azure emphasis." };
  }
  if (/\b(elasticsearch|query dsl|search relevance)\b/.test(text)) {
    return { cvPath: "/cv/archive/elasticsearch", cvLabel: "Elasticsearch + Node", match: "strong", matchReason: "Search or Elasticsearch emphasis." };
  }
  if (/\b(django|remix)\b/.test(text)) {
    return { cvPath: "/cv/archive/electric-air", cvLabel: "Django + React", match: "strong", matchReason: "Django, React or Remix stack." };
  }
  if (job.track === "Python + React Full Stack") {
    return { cvPath: "/cv/archive/python-react-aws", cvLabel: "Python + React + AWS", match: "strong", matchReason: "Python and React full-stack track." };
  }
  if (job.track === "Python Backend") {
    return { cvPath: "/cv/archive/python-react-aws", cvLabel: "Python + AWS", match: "general", matchReason: "Closest existing Python-focused CV; backend details require review." };
  }
  if (job.track === "React + Node Full Stack" || /\b(nestjs|node js)\b/.test(text)) {
    return { cvPath: "/cv/archive/designli", cvLabel: "React + Node", match: "strong", matchReason: "React and Node/NestJS emphasis." };
  }
  if (job.track === "React / Frontend") {
    return { cvPath: "/cv/archive/designli", cvLabel: "React + Next.js", match: "strong", matchReason: "React-focused web role." };
  }
  if (job.track === "Java Backend") {
    return { cvPath: "/cv/archive/java", cvLabel: "Java + Spring Boot", match: "strong", matchReason: "Java backend track." };
  }
  if (job.track === "Java + React Full Stack" || (/\bjava\b/.test(text) && /\breact\b/.test(text))) {
    return { cvPath: "/cv/archive/master", cvLabel: "Java + React master", match: "strong", matchReason: "Java and React full-stack track." };
  }
  if (/\bjava\b/.test(text)) {
    return { cvPath: "/cv/archive/java", cvLabel: "Java + Spring Boot", match: "general", matchReason: "Java is present, but the full posting should be reviewed." };
  }
  return { cvPath: "/cv/archive/master", cvLabel: "General full-stack", match: "general", matchReason: "Broadest existing software CV; tailor it before applying." };
}

function mapStatus(status: string): ApplicationStatus {
  if (status === "Interview") return "interviewing";
  if (status === "Recruiter Contact") return "screening";
  if (status === "Applied") return "applied";
  if (status === "Offer") return "offer";
  if (status === "Screening") return "screening";
  if (status === "Assessment") return "assessment";
  if (status === "Rejected") return "rejected";
  return "draft";
}

function mapPriority(priority: string, userSignal: string): number {
  if (priority === "Top" || userSignal === "Interview") return 5;
  if (priority === "High" || userSignal) return 4;
  if (priority === "Medium") return 3;
  if (priority === "Low") return 1;
  return 0;
}

function toNumber(value: number | string): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function ratingFor(id: string): Pick<JobLead, "rating10" | "ratingReason"> {
  return JOB_RATINGS[id] ?? { rating10: 0, ratingReason: "Not rated yet; run scripts/rate_jobs.py" };
}

/** Comparable posting address: LinkedIn job id, or the URL without scheme, query or trailing slash. */
function postingKey(url: string): string {
  const clean = url.trim().toLowerCase().split(/[?#]/)[0].replace(/\/$/, "");
  const linkedIn = /linkedin\.com\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(clean);
  return linkedIn ? `linkedin:${linkedIn[1]}` : clean.replace(/^https?:\/\/(www\.)?/, "");
}

function roleKey(company: string, title: string): string {
  return `${normalized(company)}|${normalized(title)}`;
}

/** LinkedIn search results that are not already tracked by company+role or posting URL. */
function uniqueResearchedJobs(): ResearchedJob[] {
  const urls = new Set(ALL_JOB_SEARCH_RECORDS.map((job) => job.url).filter(Boolean).map(postingKey));
  const roles = new Set(ALL_JOB_SEARCH_RECORDS.map((job) => roleKey(job.company, job.title)));
  return RESEARCHED_JOBS.filter((job) => {
    const url = postingKey(job.url);
    const role = roleKey(job.company, job.title);
    if (urls.has(url) || roles.has(role)) return false;
    urls.add(url);
    roles.add(role);
    return true;
  });
}

function researchedJobLead(job: ResearchedJob): JobLead {
  const record = {
    id: job.id,
    company: job.company,
    title: job.title,
    track: "Java + React Full Stack",
    stack: "",
  } as JobSearchRecord;
  const cv = campaignMatch({ ...record, url: job.url }) ?? generalCvMatch(record);
  const status = job.status ?? "";
  return {
    id: job.id,
    applicationSlug: cv.applicationSlug ?? `job-search/${job.id}`,
    company: job.company,
    title: job.title,
    location: job.location || DEFAULT_REMOTE_LOCATION,
    url: job.url,
    postedOn: job.postedOn || undefined,
    ...cv,
    track: record.track,
    seniority: "",
    stack: "",
    eligibility: job.location,
    workMode: "",
    engagement: "",
    sourcePriority: "",
    locationFit: "",
    contractorSignal: "",
    preferenceExclusion: "",
    userSignal: "",
    sourceStatus: status,
    listingStatus: CLOSED_JOB_ID_SET.has(job.id) ? "closed" : isVerifiedOpenJobCurrent(job.id) ? "open" : "unknown",
    firstSeen: job.postedOn,
    lastSeen: job.postedOn,
    nextStep: "",
    recordQuality: job.match === "exact" ? "LinkedIn exact Java + React search result" : "LinkedIn keyword search result",
    sources: "LinkedIn Java + React search",
    sourceNotes: isVerifiedOpenJobCurrent(job.id)
      ? "Employer application page confirmed this listing is accepting applications (2026-10-22)."
      : "",
    initialStatus: mapStatus(status),
    initialPriority: 0,
    seeded: true,
    ...ratingFor(job.id),
  } satisfies JobLead;
}

export function createDefaultJobs(): JobLead[] {
  const tracked = ALL_JOB_SEARCH_RECORDS.map((job) => {
    const cv = campaignMatch(job) ?? generalCvMatch(job);
    return {
      id: job.id,
      applicationSlug: cv.applicationSlug ?? `job-search/${job.id}`,
      company: job.company,
      title: job.title,
      location: job.eligibility || job.locationFit || DEFAULT_REMOTE_LOCATION,
      url: job.url,
      postedOn: job.postedOn || undefined,
      postedOnSource: job.postedOnSource,
      ...cv,
      track: job.track,
      seniority: job.seniority,
      stack: job.stack,
      eligibility: job.eligibility,
      workMode: job.workMode,
      engagement: job.engagement,
      sourcePriority: job.sourcePriority,
      matchScore: toNumber(job.matchScore),
      locationFit: job.locationFit,
      contractorSignal: job.contractorSignal,
      preferenceExclusion: job.preferenceExclusion,
      userSignal: job.userSignal,
      sourceStatus: job.sourceStatus,
      listingStatus: CLOSED_JOB_ID_SET.has(job.id) ? "closed" : isVerifiedOpenJobCurrent(job.id) ? "open" : "unknown",
      firstSeen: job.firstSeen,
      lastSeen: job.lastSeen,
      seenCount: toNumber(job.seenCount),
      nextStep: job.nextStep,
      recordQuality: job.recordQuality,
      sources: job.sources,
      sourceNotes: CLOSED_JOB_ID_SET.has(job.id)
        ? [job.notes, "Employer application page confirmed this listing is closed (2026-10-22)."]
            .filter(Boolean)
            .join(" ")
        : isVerifiedOpenJobCurrent(job.id)
          ? [job.notes, "Employer application page confirmed this listing is accepting applications (2026-10-22)."]
              .filter(Boolean)
              .join(" ")
          : job.notes,
      initialStatus: mapStatus(job.sourceStatus),
      initialPriority: mapPriority(job.sourcePriority, job.userSignal),
      seeded: true,
      ...ratingFor(job.id),
    } satisfies JobLead;
  });
  return [...tracked, ...uniqueResearchedJobs().map(researchedJobLead)];
}

export const JOB_TRACKS = [
  ...new Set([...ALL_JOB_SEARCH_RECORDS.map((job) => job.track), "Java + React Full Stack"].filter(Boolean)),
].sort((a, b) => a.localeCompare(b));

/** Complete search history for the directory; shortlist eligibility never limits this list. */
export function createAllSearchedJobs(): JobLead[] {
  const tracked = createDefaultJobs();
  const ids = new Set(tracked.map(job => job.id));
  const omittedResearch = RESEARCHED_JOBS.filter(job => !ids.has(job.id)).map(researchedJobLead);
  const tailored = campaignJobs.map(job => ({
    ...researchedJobLead({ id: `campaign:${job.key}`, company: job.company, title: job.postingTitle, location: job.location, postedOn: "", url: job.jobUrl, match: "search" }),
    applicationSlug: `java-react-2026/${job.key}`,
    cvPath: `/cv/cv-archive/java-react-2026/${job.key}`,
    sources: "Tailored CV campaign",
    sourceNotes: job.proof,
  }));
  const employerResearch = companyResearch.map((job, index) => ({
    ...researchedJobLead({ id: `employer-research:${index}`, company: job.company, title: job.role, location: job.region, postedOn: "", url: job.source, match: "search" }),
    track: job.track,
    workMode: job.workMode,
    sourceNotes: job.notes,
    sources: "Employer hiring research",
    firstSeen: job.checkedOn,
    lastSeen: job.checkedOn,
  }));
  return [...tracked, ...omittedResearch, ...tailored, ...employerResearch];
}
