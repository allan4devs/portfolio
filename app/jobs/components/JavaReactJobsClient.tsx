"use client";

import { JobBoardScreen } from "./JobBoardScreen";
import { JobBoardProvider } from "./JavaReactJobsContext";
import type { JobBoardView } from "../java-react-jobs-types";

export function JavaReactJobsClient({ view = "active" }: { view?: JobBoardView }) {
  return (
    <JobBoardProvider key={view} view={view}>
      <JobBoardScreen />
    </JobBoardProvider>
  );
}
