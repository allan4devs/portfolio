"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Search } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER, STATUS_CLASS } from "../../(page_routes)/cv/applications";
import type { ApplicationStatus } from "../../(page_routes)/cv/applications";
import { useJobBoard } from "./JavaReactJobsContext";

const APPLIED_STATUSES = new Set<ApplicationStatus>([
  "applied",
  "screening",
  "interviewing",
  "assessment",
  "offer",
  "rejected",
]);

export function AppliedJobsTable() {
  const { ready, rows: boardRows, hotRows } = useJobBoard();
  const rows = useMemo(() => [...hotRows, ...boardRows], [boardRows, hotRows]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const appliedRows = useMemo(
    () => rows.filter(({ state }) => APPLIED_STATUSES.has(state.status) || Boolean(state.appliedOn)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return appliedRows.filter(({ job, state }) => {
      if (statusFilter !== "all" && state.status !== statusFilter) return false;
      const regionText = `${job.location} ${job.eligibility} ${job.locationFit}`.toLowerCase();
      if (regionFilter === "latam" && !/latam|latin america|south america|central america|brazil|argentina|colombia|mexico|peru|chile|uruguay|ecuador|panama|costa rica/.test(regionText)) return false;
      if (regionFilter === "costa-rica" && !/costa rica|costarica/.test(regionText)) return false;
      if (!normalizedQuery) return true;
      return `${job.company} ${job.title} ${job.stack} ${job.location} ${job.eligibility} ${state.stage} ${state.notes}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [appliedRows, query, regionFilter, statusFilter]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-teal-300">
            <ArrowLeft size={14} /> Back to jobs
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300"><BriefcaseBusiness size={22} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">CV workspace</p>
              <h1 className="text-2xl font-bold text-white">Jobs I applied to</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-zinc-400">
            MongoDB has no applied-job collection. This table reads the application statuses saved in this browser.
          </p>
        </header>

        <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3" aria-label="Filter applied jobs">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_200px_200px_auto]">
            <label className="relative">
              <span className="sr-only">Search applied jobs</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, job, skills, notes" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-teal-500" />
            </label>
            <label>
              <span className="sr-only">Filter by application status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "all")} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                <option value="all">All application statuses</option>
                {STATUS_ORDER.filter((status) => status !== "draft").map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by location</span>
              <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                <option value="all">All locations</option><option value="latam">LATAM keywords</option><option value="costa-rica">Costa Rica</option>
              </select>
            </label>
            <button type="button" onClick={() => { setQuery(""); setStatusFilter("all"); setRegionFilter("all"); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Clear filters</button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">{ready ? `${filteredRows.length} of ${appliedRows.length} applied jobs` : "Loading saved application statuses…"}</p>
        </section>

        {filteredRows.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                <tr><th className="px-4 py-3">Company</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Stage / notes</th><th className="px-4 py-3">Link</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950/60">
                {filteredRows.map(({ job, state }) => (
                  <tr key={job.id} className="align-top hover:bg-zinc-900/70">
                    <td className="px-4 py-3 font-medium text-white">{job.company}</td>
                    <td className="px-4 py-3"><p className="font-medium text-zinc-200">{job.title}</p><p className="mt-1 max-w-sm text-xs text-zinc-500">{job.stack}</p></td>
                    <td className="px-4 py-3 text-zinc-300">{job.location || job.eligibility || "Not listed"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${STATUS_CLASS[state.status]}`}>{STATUS_LABEL[state.status]}</span></td>
                    <td className="px-4 py-3 text-zinc-300">{state.appliedOn || "Not recorded"}</td>
                    <td className="max-w-xs px-4 py-3 text-zinc-400">{state.stage || state.notes || "—"}</td>
                    <td className="px-4 py-3">{job.url ? <a href={job.url} target="_blank" rel="noreferrer" className="font-medium text-teal-300 underline underline-offset-4">Open ↗</a> : <span className="text-zinc-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
            {ready ? "No applied jobs match these filters. Application statuses can be updated from Jobs." : "Loading your saved jobs…"}
          </p>
        )}
      </div>
    </main>
  );
}
