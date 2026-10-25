"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { ApplicationState } from "../../(page_routes)/cv/applications";
import { useApplications } from "../../(page_routes)/cv/useApplications";
import { createDefaultJobs } from "../java-react-jobs-data";
import { calculateJobStats, isArchivedRow, jobPostingKey, selectJobRows, toJobRows } from "../java-react-jobs-helpers";
import { formatHotIds, isHotCandidate, loadDismissedHotIds, loadHotIds, loadRotatedHotIds, rankHotCandidates, saveDismissedHotIds, saveHotIds, saveRotatedHotIds, seedHotIds, selectHotIds } from "../java-react-jobs-hot";
import { HOT_LIMIT } from "../java-react-jobs-constants";
import { auditJobRows, jobCompanyKey } from "../java-react-jobs-audit";
import { readStoredJobs, writeStoredJobs } from "../java-react-jobs-memory";
import { resolveJobApplication } from "../java-react-jobs-applications";
import type {
  JobBoardView,
  JobLead,
  JobLeadPatch,
  JobRowModel,
  JobStats,
  RatingFilter,
  SortMode,
  StatusFilter,
  TrackFilter,
} from "../java-react-jobs-types";

type JobBoardContextValue = {
  ready: boolean;
  rows: JobRowModel[];
  hotRows: JobRowModel[];
  hotIds: string[];
  hotFromSeed: boolean;
  toggleHot: (id: string) => boolean;
  resetHot: () => void;
  reloadHot: () => number;
  remainingHotCount: number;
  tracks: string[];
  hotExport: string;
  stats: JobStats;
  auditCounts: { total: number; archived: number; backlog: number; selected: number };
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  statusFilter: StatusFilter;
  setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;
  trackFilter: TrackFilter;
  setTrackFilter: Dispatch<SetStateAction<TrackFilter>>;
  minRating: RatingFilter;
  setMinRating: Dispatch<SetStateAction<RatingFilter>>;
  sortMode: SortMode;
  setSortMode: Dispatch<SetStateAction<SortMode>>;
  view: JobBoardView;
  openId: string | null;
  toggleOpen: (id: string) => void;
  updateJob: (id: string, patch: JobLeadPatch) => void;
  updateApplication: (slug: string, patch: Partial<ApplicationState>) => void;
};

const JobBoardContext = createContext<JobBoardContextValue | null>(null);

export function JobBoardProvider({ children, view }: { children: ReactNode; view: JobBoardView }) {
  const { get: getStoredApplication, raw: storedApplications, update: updateStoredApplication, ready } = useApplications();
  const [jobs, setJobs] = useState<JobLead[]>(createDefaultJobs);
  const [storageReady, setStorageReady] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<RatingFilter>(0);
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [preferredHotIds, setPreferredHotIds] = useState<string[]>(seedHotIds);
  const [dismissedHotIds, setDismissedHotIds] = useState<string[]>([]);
  const [rotatedHotIds, setRotatedHotIds] = useState<string[]>([]);
  const [hotFromSeed, setHotFromSeed] = useState(true);

  useEffect(() => {
    const defaults = createDefaultJobs();
    setJobs(readStoredJobs(defaults));
    const canonicalIds = new Map(defaults.flatMap((job) => [job.id, ...(job.sourceIds ?? [])].map((id) => [id, job.id] as const)));
    const restoreIds = (ids: string[]) => [...new Set(ids.map((id) => canonicalIds.get(id) ?? id))];
    const storedHot = loadHotIds();
    if (storedHot) {
      setPreferredHotIds(restoreIds(storedHot));
      setHotFromSeed(false);
    }
    const dismissed = restoreIds(loadDismissedHotIds());
    setDismissedHotIds(dismissed);
    const rotated = restoreIds(loadRotatedHotIds());
    setRotatedHotIds(rotated);
    if (dismissed.length || rotated.length) setHotFromSeed(false);
    setStorageReady(true);
  }, []);

  const resetHot = useCallback(() => {
    saveHotIds(null);
    saveDismissedHotIds([]);
    saveRotatedHotIds([]);
    setPreferredHotIds(seedHotIds());
    setDismissedHotIds([]);
    setRotatedHotIds([]);
    setOpenId(null);
    setHotFromSeed(true);
  }, []);

  useEffect(() => {
    if (storageReady) writeStoredJobs(jobs);
  }, [jobs, storageReady]);

  const getApplication = useCallback(
    (job: JobLead): ApplicationState => {
      return resolveJobApplication(job, storedApplications, getStoredApplication(job.applicationSlug));
    },
    [getStoredApplication, storedApplications],
  );

  const updateApplication = useCallback((slug: string, patch: Partial<ApplicationState>) => {
    const job = jobs.find((candidate) => candidate.applicationSlug === slug || candidate.applicationAliases?.includes(slug));
    const current = job ? getApplication(job) : getStoredApplication(slug);
    const merged = { ...current, ...patch };
    for (const key of new Set([slug, ...(job ? [job.applicationSlug, ...(job.applicationAliases ?? [])] : [])])) updateStoredApplication(key, merged);
  }, [getApplication, getStoredApplication, jobs, updateStoredApplication]);

  const candidateRows = useMemo(
    () => auditJobRows(toJobRows(jobs, getApplication, new Set()), dismissedHotIds),
    [dismissedHotIds, getApplication, jobs],
  );
  const hotIds = useMemo(
    () => selectHotIds(candidateRows, preferredHotIds, dismissedHotIds, rotatedHotIds),
    [candidateRows, dismissedHotIds, preferredHotIds, rotatedHotIds],
  );

  const remainingHotCount = useMemo(
    () => rankHotCandidates(candidateRows, [], dismissedHotIds, [...rotatedHotIds, ...hotIds]).length,
    [candidateRows, dismissedHotIds, hotIds, rotatedHotIds],
  );

  const reloadHot = useCallback(() => {
    const nextRotated = [...new Set([...rotatedHotIds, ...hotIds])];
    const nextIds = selectHotIds(candidateRows, [], dismissedHotIds, nextRotated);
    if (!nextIds.length) return 0;
    setPreferredHotIds(nextIds);
    setRotatedHotIds(nextRotated);
    setHotFromSeed(false);
    setOpenId(null);
    saveHotIds(nextIds);
    saveRotatedHotIds(nextRotated);
    return nextIds.length;
  }, [candidateRows, dismissedHotIds, hotIds, rotatedHotIds]);

  const toggleHot = useCallback((id: string) => {
    const row = candidateRows.find((candidate) => candidate.job.id === id);
    if (!row) return false;
    const postingKey = jobPostingKey(row.job.url);
    const companyKey = jobCompanyKey(row.job.company);
    const samePostingIds = new Set(candidateRows
      .filter((candidate) => candidate.job.id === id || jobCompanyKey(candidate.job.company) === companyKey || (postingKey && jobPostingKey(candidate.job.url) === postingKey))
      .map((candidate) => candidate.job.id));
    const isHot = hotIds.some((hotId) => samePostingIds.has(hotId));
    if (!isHot && !isHotCandidate(row)) return false;
    const nextPreferred = isHot
      ? preferredHotIds.filter((hotId) => !samePostingIds.has(hotId))
      : [id, ...preferredHotIds.filter((hotId) => !samePostingIds.has(hotId))].slice(0, HOT_LIMIT);
    const nextDismissed = isHot
      ? [...dismissedHotIds.filter((hotId) => !samePostingIds.has(hotId)), ...samePostingIds]
      : dismissedHotIds.filter((hotId) => !samePostingIds.has(hotId));
    const nextRotated = rotatedHotIds.filter((hotId) => !samePostingIds.has(hotId));
    if (!isHot && !selectHotIds(candidateRows, nextPreferred, nextDismissed, nextRotated).includes(id)) return false;
    setPreferredHotIds(nextPreferred);
    setDismissedHotIds(nextDismissed);
    setRotatedHotIds(nextRotated);
    setHotFromSeed(false);
    saveHotIds(nextPreferred);
    saveDismissedHotIds(nextDismissed);
    saveRotatedHotIds(nextRotated);
    return true;
  }, [candidateRows, dismissedHotIds, hotIds, preferredHotIds, rotatedHotIds]);

  const allRows = useMemo(
    () => candidateRows.map((row) => ({ ...row, hot: hotIds.includes(row.job.id) })),
    [candidateRows, hotIds],
  );
  const rows = useMemo(
    () => selectJobRows({ rows: allRows, query, statusFilter, trackFilter, minRating, sortMode, view }),
    [allRows, minRating, query, sortMode, statusFilter, trackFilter, view],
  );
  const tracks = useMemo(
    () => [...new Set(allRows.filter((row) => (view === "archive") === isArchivedRow(row)).map(({ job }) => job.track).filter(Boolean))].sort(),
    [allRows, view],
  );
  const hotRows = useMemo(
    () => {
      if (view !== "active") return [];
      const byId = new Map(allRows.map((row) => [row.job.id, row]));
      return hotIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
    },
    [allRows, hotIds, view],
  );
  const hotExport = useMemo(
    () => formatHotIds(hotIds, new Map(jobs.map((job) => [job.id, `${job.company} - ${job.title} (${job.rating10})`]))),
    [hotIds, jobs],
  );
  const stats = useMemo(
    () => calculateJobStats(allRows.filter((row) => (view === "archive") === isArchivedRow(row)).map((row) => row.job), getApplication),
    [allRows, getApplication, view],
  );
  const auditCounts = useMemo(() => {
    const archived = allRows.filter(isArchivedRow).length;
    return { total: allRows.length, archived, backlog: allRows.length - archived, selected: allRows.filter(isHotCandidate).length };
  }, [allRows]);

  const value = useMemo<JobBoardContextValue>(
    () => ({
      ready: ready && storageReady,
      rows,
      hotRows,
      hotIds,
      hotFromSeed,
      toggleHot,
      resetHot,
      reloadHot,
      remainingHotCount,
      tracks,
      hotExport,
      stats,
      auditCounts,
      query,
      setQuery,
      statusFilter,
      setStatusFilter,
      trackFilter,
      setTrackFilter,
      minRating,
      setMinRating,
      sortMode,
      setSortMode,
      view,
      openId,
      toggleOpen: (id) => setOpenId((current) => (current === id ? null : id)),
      updateJob: (id, patch) =>
        setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job))),
      updateApplication,
    }),
    [
      hotExport,
      auditCounts,
      hotFromSeed,
      hotIds,
      hotRows,
      minRating,
      openId,
      query,
      ready,
      resetHot,
      reloadHot,
      remainingHotCount,
      rows,
      sortMode,
      stats,
      storageReady,
      statusFilter,
      toggleHot,
      trackFilter,
      tracks,
      updateApplication,
      view,
    ],
  );

  return <JobBoardContext.Provider value={value}>{children}</JobBoardContext.Provider>;
}

export function useJobBoard(): JobBoardContextValue {
  const context = useContext(JobBoardContext);
  if (!context) throw new Error("useJobBoard must be used inside JobBoardProvider");
  return context;
}
