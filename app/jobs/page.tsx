import type { Metadata } from "next";
import { JavaReactJobsClient } from "./components/JavaReactJobsClient";

export const metadata: Metadata = {
  title: "All Software Jobs | Application Tracker",
  description: "A local application tracker for every consolidated software opportunity.",
};

export default function JobsPage() {
  return <JavaReactJobsClient view="active" />;
}
