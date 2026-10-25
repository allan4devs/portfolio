import type { Metadata } from "next";
import { JavaReactJobsClient } from "../components/JavaReactJobsClient";

export const metadata: Metadata = {
  title: "Job Archive | Seen & Archived",
  robots: { index: false, follow: false },
};

export default function JobsArchivePage() {
  return <JavaReactJobsClient view="archive" />;
}
