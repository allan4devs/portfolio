"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, FileText, Search } from "lucide-react";
import { auditJd, buildCorpus, DICT_CATEGORY_ORDER, type AuditResult, type DictHit } from "../audit";
import * as baseCv from "../data/cv-data-java-react";
import { CvGenerateAction } from "./CvGenerateAction";
import type { CvProfile } from "@/lib/cv/types";
import { CV_JD_DRAFT_KEY, CV_JD_MAX_LENGTH } from "@/lib/cv/draft";

const MIN_JD_LENGTH = 30;
const MAX_JD_LENGTH = CV_JD_MAX_LENGTH;
const BASE_CORPUS = buildCorpus(baseCv);
const field =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

function sortHits(hits: DictHit[]): DictHit[] {
  return [...hits].sort(
    (a, b) =>
      DICT_CATEGORY_ORDER.indexOf(a.category) - DICT_CATEGORY_ORDER.indexOf(b.category) ||
      a.label.localeCompare(b.label),
  );
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-teal-700";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

export function CvGenerator({ initialJd = "" }: { initialJd?: string }) {
  const [jd, setJd] = useState(initialJd);
  const [hasCompared, setHasCompared] = useState(false);
  const [corpus, setCorpus] = useState(BASE_CORPUS);
  const [sourceName, setSourceName] = useState("base CV");

  useEffect(() => {
    try {
      setJd(initialJd || sessionStorage.getItem(CV_JD_DRAFT_KEY) || "");
      if (initialJd) sessionStorage.setItem(CV_JD_DRAFT_KEY, initialJd);
    } catch {
      // The comparison still works when browser storage is unavailable.
    }
  }, [initialJd]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/cv/profile", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const { profile } = await response.json() as { profile: CvProfile };
      setCorpus([...profile.summary, ...profile.skillGroups.flatMap((group) => group.items), ...profile.experience.flatMap((job) => job.bullets)].join("\n"));
      setSourceName("saved experience");
    }).catch(() => { /* Keep the archive comparison available offline. */ });
    return () => controller.abort();
  }, []);

  const result = useMemo<AuditResult | null>(
    () => (hasCompared && jd.trim().length >= MIN_JD_LENGTH ? auditJd(jd, corpus) : null),
    [hasCompared, jd, corpus],
  );
  const covered = result ? sortHits(result.covered) : [];
  const missing = result ? sortHits(result.missing) : [];

  function updateJd(value: string) {
    setJd(value);
    setHasCompared(false);
    try {
      sessionStorage.setItem(CV_JD_DRAFT_KEY, value);
    } catch {
      // The comparison still works when browser storage is unavailable.
    }
  }

  function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasCompared(true);
  }

  return (
    <main className="min-h-screen bg-[#f5f4f0] px-5 py-10 text-zinc-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-12 flex items-center justify-between text-sm">
          <Link href="/cv" className="flex items-center gap-2 font-semibold">
            <FileText size={18} /> CV Studio
          </Link>
          <div className="flex flex-wrap justify-end gap-5">
            <Link href="/jobs" className="text-zinc-600 hover:text-zinc-900">Jobs</Link>
            <Link href="/cv/scraper" className="text-zinc-600 hover:text-zinc-900">Import a job URL</Link>
            <Link href="/cv/cv-archive" className="text-zinc-600 hover:text-zinc-900">CV archive</Link>
          </div>
        </nav>
        <header className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Your experience. A sharper fit.
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Paste the job.
            <br />
            Make it your CV.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-zinc-600">
            Compare the keywords, then create a tailored CV from your saved experience. Add missing
            facts to your profile and the next CV will use them.
          </p>
        </header>

        <form onSubmit={compare} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <label htmlFor="job-description" className="mb-3 block text-sm font-semibold">
            Job description
          </label>
          <textarea
            id="job-description"
            value={jd}
            onChange={(event) => updateJd(event.target.value)}
            placeholder={"Paste the role, responsibilities, and requirements here…\n\nYou can copy straight from the job page."}
            required
            minLength={MIN_JD_LENGTH}
            maxLength={MAX_JD_LENGTH}
            className={`${field} min-h-[340px] resize-y leading-relaxed sm:min-h-[420px]`}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-zinc-500">
              {jd.length.toLocaleString()} / {MAX_JD_LENGTH.toLocaleString()} characters
            </span>
            <button
              type="submit"
              disabled={jd.trim().length < MIN_JD_LENGTH}
              className="inline-flex items-center gap-3 rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight size={17} />
              Compare keywords
            </button>
          </div>
        </form>

        <CvGenerateAction jd={jd} />

        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          The keyword comparison runs in this page. CV generation runs on your server and saves the
          result. Neither uses external AI. The score is a reference, not an ATS result or a promise of fit.
        </p>

        {result && (
          <section aria-live="polite" className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Match with {sourceName}</p>
                <p className={`mt-1 text-4xl font-semibold tabular-nums ${scoreTone(result.score)}`}>
                  {result.score}%
                </p>
              </div>
              <p className="text-sm text-zinc-600">
                {result.matched} of {result.total} recognized job keywords appear in your {sourceName}.
              </p>
            </div>

            {result.total === 0 && (
              <p className="py-5 text-sm text-zinc-600">
                No recognized skills or technologies were found in this description. Try including the
                responsibilities and requirements section.
              </p>
            )}

            {missing.length > 0 && (
              <div className="pt-5">
                <h2 className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Not found in your {sourceName} ({missing.length})
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missing.map((hit) => (
                    <span
                      key={hit.label}
                      title={hit.category}
                      className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                    >
                      {hit.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {covered.length > 0 && (
              <div className="pt-5">
                <h2 className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  Already covered ({covered.length})
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {covered.map((hit) => (
                    <span
                      key={hit.label}
                      title={hit.category}
                      className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700"
                    >
                      {hit.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.extra.length > 0 && (
              <div className="pt-5">
                <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Other repeated terms ({result.extra.length})
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.extra.map((term) => (
                    <span
                      key={term.term}
                      className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600"
                    >
                      {term.term}
                      <span className="tabular-nums text-zinc-400">×{term.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <p className="mt-6 text-sm text-zinc-600">
          Want to review the source résumé?{" "}
          <Link href="/cv/cv-archive/master" className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-800">
            <Search size={14} />
            Open the base CV
          </Link>
        </p>
      </div>
    </main>
  );
}
