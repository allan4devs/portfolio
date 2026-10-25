import { cvVariants } from "../(page_routes)/cv/variants";
import { DEFAULT_REMOTE_LOCATION } from "./java-react-jobs-constants";
import type { JobLead } from "./java-react-jobs-types";

/** Company-specific application targets only; resume employment history is not a job source. */
export function createCvBacklogJobs(): JobLead[] {
  return cvVariants.filter((variant) => Boolean(variant.company?.trim())).map((variant): JobLead => ({
    id: `cv:${variant.slug}`,
    applicationSlug: variant.slug,
    company: variant.company!.trim(),
    title: variant.postingTitle || variant.role,
    location: variant.location || DEFAULT_REMOTE_LOCATION,
    url: variant.jobUrl || "",
    cvPath: variant.path,
    cvLabel: variant.name,
    match: "tailored",
    matchReason: "Company-specific CV already exists.",
    track: "CV target",
    seniority: "",
    stack: variant.focus.join(", "),
    eligibility: variant.location || "",
    workMode: "",
    engagement: "",
    sourcePriority: "",
    locationFit: "",
    contractorSignal: "",
    preferenceExclusion: "",
    userSignal: "",
    sourceStatus: "",
    listingStatus: "unknown",
    // A CV tailoring date is not evidence of the posting's publication or discovery date.
    firstSeen: "",
    lastSeen: "",
    nextStep: "Review the existing CV and verify the posting before applying.",
    recordQuality: "Company-specific CV target; publication date and availability unverified",
    sources: `CV variant: ${variant.path}`,
    sourceNotes: variant.tailoredOn ? `CV tailored on ${variant.tailoredOn}; job publication date not supplied.` : "",
    initialStatus: "draft",
    initialPriority: 0,
    seeded: true,
    rating10: 0,
    ratingReason: "Not rated yet; imported from an existing CV target.",
  }));
}
