"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, FileText, Flame, Mail, Star } from "lucide-react";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  STATUS_ORDER,
  type ApplicationState,
  type ApplicationStatus,
} from "../../(page_routes)/cv/applications";
import { isFilledJob } from "../java-react-jobs-helpers";
import { isHotCandidate } from "../java-react-jobs-hot";
import type { JobLead, JobLeadPatch } from "../java-react-jobs-types";
import { FIELD_CLASS, MATCH_CLASS, MATCH_LABEL } from "../java-react-jobs-values";
import { Field } from "./JobBoardField";
import { JobAvailabilityCheck } from "./JobAvailabilityCheck";

export function JobRow({
  job,
  number,
  state,
  hot,
  archiveReason,
  hotExclusionReason,
  auditRank,
  open,
  onToggle,
  onToggleHot,
  onJobChange,
  onApplicationChange,
}: {
  job: JobLead;
  number: number;
  state: ApplicationState;
  hot: boolean;
  archiveReason?: string;
  hotExclusionReason?: string;
  auditRank?: number;
  open: boolean;
  onToggle: () => void;
  onToggleHot: () => void;
  onJobChange: (patch: JobLeadPatch) => void;
  onApplicationChange: (patch: Partial<ApplicationState>) => void;
}) {
  const filled = isFilledJob(job);
  const canPin = isHotCandidate({ job, state, archiveReason, hotExclusionReason });
  return (
    <article className={`[content-visibility:auto] rounded-xl border bg-zinc-900/70 transition-colors ${hot ? "border-orange-500/50 hover:border-orange-400" : "border-zinc-800 hover:border-zinc-700"}`}>
      <div className="grid items-center gap-3 p-3 md:grid-cols-[42px_minmax(230px,1.4fr)_minmax(180px,0.9fr)_150px_auto]">
        <span className="text-center font-mono text-xs font-bold tabular-nums text-zinc-600">
          {auditRank ? `#${auditRank}` : String(number).padStart(3, "0")}
        </span>

        <button type="button" onClick={onToggle} className="min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className={`truncate text-sm font-bold ${filled ? "text-white" : "text-zinc-500"}`}>
              {job.company || "Available job slot"}
            </p>
            {job.listingStatus === "closed" ? (
              <span className="shrink-0 rounded bg-zinc-700/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-300">
                Closed
              </span>
            ) : job.listingStatus === "unknown" ? (
              <span className="shrink-0 rounded bg-amber-950/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                Verify
              </span>
            ) : null}
            <span title={`Deterministic fit: ${job.ratingReason}`} className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${ratingClass(job.rating10)}`}>
              {Math.round(job.rating10 * 10)}% fit
            </span>
            {filled ? (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${MATCH_CLASS[job.match]}`}>
                {MATCH_LABEL[job.match]}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-400">{job.title || "Add the next verified opportunity"}</p>
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-600">{job.track}<span className="normal-case tracking-normal text-zinc-500"> · {job.ratingReason}</span></p>
          {archiveReason ? <p className="mt-1 text-[11px] leading-snug text-amber-300">Archived: {archiveReason}</p> : null}
          {!archiveReason && hotExclusionReason ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">Outside HOT: {hotExclusionReason}</p> : null}
        </button>

        <div className="min-w-0">
          <p className="truncate text-xs text-zinc-400">
            {job.location}
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-500">Posted: {job.postedOn || "Date not provided"}</p>
          {job.lastSeen ? <p className="mt-0.5 text-[10px] text-zinc-500">Last checked: {job.lastSeen}</p> : null}
          {state.stage ? <p className="mt-0.5 truncate text-[11px] text-zinc-500">Next: {state.stage}</p> : null}
        </div>

        <select
          value={state.status}
          onChange={(event) => onApplicationChange({ status: event.target.value as ApplicationStatus })}
          aria-label={`Application status for job ${number}`}
          className={`rounded-lg border px-2 py-1.5 text-xs font-bold uppercase tracking-wide outline-none ${STATUS_CLASS[state.status]}`}
        >
          {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
        </select>

        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onToggleHot} disabled={!canPin && !hot} aria-pressed={hot} title={!canPin && !hot ? archiveReason || hotExclusionReason || "This job does not meet the October shortlist rules" : hot ? "Dismiss from HOT and move to Archive" : "Prioritize this eligible October job in HOT"} aria-label={hot ? `Dismiss job ${number} from HOT` : `Mark job ${number} as HOT`} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40 ${hot ? "border-orange-500 bg-orange-500/15 text-orange-300" : "border-zinc-700 text-zinc-500 hover:border-orange-500 hover:text-orange-300"}`}>
            <Flame size={14} />
          </button>
          <label title={job.seen ? "Clear seen mark; shortlist rules still apply" : "Mark as seen / old / completed"} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-700 px-2 text-[11px] font-semibold text-zinc-400 hover:border-teal-500 hover:text-teal-300">
            <input type="checkbox" checked={Boolean(job.seen)} onChange={(event) => onJobChange({ seen: event.target.checked })} aria-label={job.seen ? `Clear seen mark for job ${number}` : `Mark job ${number} as seen, old, or completed`} className="h-3.5 w-3.5 accent-teal-500" />
            <span className="hidden xl:inline">Seen</span>
          </label>
          {job.cvPath ? <Link href={job.cvPath} title={`Open suggested CV: ${job.cvLabel ?? "CV"}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-700 px-2 text-[11px] font-semibold text-zinc-300 hover:border-teal-500 hover:text-teal-300"><FileText size={12} /> CV</Link> : null}
          {job.url ? <a href={job.url} target="_blank" rel="noreferrer" title="Open job posting" className="inline-flex h-8 items-center gap-1 rounded-lg border border-teal-700 bg-teal-500/10 px-2 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/20"><ExternalLink size={12} /> Job</a> : null}
          <button type="button" onClick={onToggle} aria-label={open ? `Close job ${number} details` : `Edit job ${number}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </div>

      {job.url ? <JobAvailabilityCheck key={`${job.url}|${job.title}`} url={job.url} title={job.title} /> : null}

      {open ? (
        <div className="border-t border-zinc-800 p-4">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <Field label="Company"><input value={job.company} onChange={(event) => onJobChange({ company: event.target.value })} placeholder="Company name" className={FIELD_CLASS} /></Field>
            <Field label="Role"><input value={job.title} onChange={(event) => onJobChange({ title: event.target.value })} placeholder="Senior Software Engineer" className={FIELD_CLASS} /></Field>
            <Field label="Eligibility / location"><input value={job.location} onChange={(event) => onJobChange({ location: event.target.value })} placeholder="Remote · LATAM" className={FIELD_CLASS} /></Field>
            <Field label="Job URL"><input type="url" value={job.url} onChange={(event) => onJobChange({ url: event.target.value })} placeholder="https://…" className={FIELD_CLASS} /></Field>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SourceFact label="Technical track" value={job.track} />
            <SourceFact label="Stack" value={job.stack || "Not provided"} />
            <SourceFact label="Work / engagement" value={[job.workMode, job.engagement].filter(Boolean).join(" · ") || "Not provided"} />
            <SourceFact label="CV suggestion" value={`${job.cvLabel ?? "No CV"} · ${job.matchReason}`} />
            <SourceFact label="Source priority" value={job.sourcePriority || "Not ranked"} />
            {job.matchScore !== undefined ? <SourceFact label="Legacy source score" value={String(job.matchScore)} /> : null}
            <SourceFact label="Location fit" value={job.locationFit || "Not classified"} />
            <SourceFact label="Contractor signal" value={job.contractorSignal || "Not classified"} />
            <SourceFact label="Review flag" value={job.preferenceExclusion || "None recorded"} />
            <SourceFact label="Deterministic fit" value={`${Math.round(job.rating10 * 10)}% · ${job.ratingReason}`} />
            <SourceFact label="Posted date" value={job.postedOn || "Date not provided by source"} />
            <SourceFact label="First found" value={job.firstSeen || "Not recorded"} />
            <SourceFact label="Last checked" value={job.lastSeen || "Not recorded"} />
            {auditRank ? <SourceFact label="Audit rank" value={`#${auditRank}`} /> : null}
            {archiveReason ? <SourceFact label="Archive reason" value={archiveReason} /> : null}
          </div>

          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs leading-relaxed text-zinc-400">
            <p><span className="font-semibold text-zinc-300">Source:</span> {job.sources || "Master job search workbook"}</p>
            <p className="mt-1"><span className="font-semibold text-zinc-300">Record quality:</span> {job.recordQuality || "Not classified"}</p>
            {job.sourceNotes ? <p className="mt-1"><span className="font-semibold text-zinc-300">Source notes:</span> {job.sourceNotes}</p> : null}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_170px_150px_170px]">
            <Field label="Next step / stage"><input value={state.stage} onChange={(event) => onApplicationChange({ stage: event.target.value })} placeholder="Recruiter call, technical interview…" className={FIELD_CLASS} /></Field>
            <Field label="Applied on"><input type="date" value={state.appliedOn} onChange={(event) => onApplicationChange({ appliedOn: event.target.value })} className={FIELD_CLASS} /></Field>
            <Field label="Priority">
              <select value={state.priority} onChange={(event) => onApplicationChange({ priority: Number(event.target.value) })} className={FIELD_CLASS}>
                <option value={0}>Not ranked</option>
                {[1, 2, 3, 4, 5].map((priority) => <option key={priority} value={priority}>{priority} / 5</option>)}
              </select>
            </Field>
            <label className="flex items-end">
              <span className="flex h-[38px] w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs font-semibold text-zinc-300">
                <input type="checkbox" checked={state.checkEmail} onChange={(event) => onApplicationChange({ checkEmail: event.target.checked })} className="h-4 w-4 accent-amber-500" />
                <Mail size={13} className="text-amber-400" /> Check email
              </span>
            </label>
          </div>

          <Field label="Notes" className="mt-3"><textarea value={state.notes} onChange={(event) => onApplicationChange({ notes: event.target.value })} rows={2} placeholder="Recruiter, salary range, requirements, follow-up date…" className={`${FIELD_CLASS} resize-y`} /></Field>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1"><Star size={11} /> Priority {state.priority || "not set"}</span>
            <span>Autosaved locally</span>
            {job.cvPath ? <span>Suggested CV: {job.cvLabel}</span> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ratingClass(rating: number): string {
  if (rating >= 8) return "bg-emerald-500/15 text-emerald-300";
  if (rating >= 6) return "bg-sky-500/15 text-sky-300";
  if (rating >= 4) return "bg-amber-500/15 text-amber-300";
  return "bg-zinc-800 text-zinc-400";
}

function SourceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-1 text-[11px] leading-snug text-zinc-300">{value}</p>
    </div>
  );
}
