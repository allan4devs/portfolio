"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createAllSearchedJobs } from "../java-react-jobs-data";
import { readStoredJobs } from "../java-react-jobs-memory";
import { buildCompanyDirectory } from "../company-directory";
import { isMidLevelJob, jobDevelopmentArea } from "../mid-level-jobs";

export function MidLevelJobs() {
  const [jobs, setJobs] = useState(createAllSearchedJobs);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [technology, setTechnology] = useState("all");
  useEffect(() => { setJobs(readStoredJobs(createAllSearchedJobs())); }, []);
  const matches = useMemo(() => buildCompanyDirectory(jobs).flatMap(company => company.jobs).filter(isMidLevelJob), [jobs]);
  const visible = matches.filter(job => {
    const text = `${job.company} ${job.title} ${job.stack} ${job.track} ${job.location}`.toLowerCase();
    return query.toLowerCase().split(/\s+/).every(word => text.includes(word))
      && (area === "all" || jobDevelopmentArea(job) === area)
      && (technology === "all" || new RegExp(`\\b${technology}(?:js)?\\b`, "i").test(`${job.title} ${job.stack} ${job.track}`));
  });
  const control = "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white";
  return <main className="min-h-screen bg-zinc-950 text-zinc-100">
    <nav aria-label="Job navigation" className="border-b border-zinc-800"><div className="mx-auto flex max-w-7xl flex-wrap gap-5 px-6 py-4 text-sm"><Link href="/cv/jobs" className="text-zinc-400 hover:text-white">Jobs</Link><Link href="/cv/jobs/mid-level" aria-current="page" className="font-semibold text-teal-300">Semi-senior / Mid-level</Link><Link href="/comp" className="text-zinc-400 hover:text-white">Companies</Link></div></nav>
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold">Semi-senior / Mid-level jobs</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Java, React, and Python opportunities in frontend, backend, and full stack. Includes your full saved search history. Roles must explicitly mention a mid-level or semi-senior level; check each posting for availability.</p>
      <div className="my-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-2 text-xs text-zinc-400">Search<input className={control} value={query} onChange={event => setQuery(event.target.value)} placeholder="Company, role, location, skills" /></label>
        <label className="flex flex-col gap-2 text-xs text-zinc-400">Development area<select className={control} value={area} onChange={event => setArea(event.target.value)}><option value="all">All areas</option><option value="frontend">Frontend</option><option value="backend">Backend</option><option value="fullstack">Full stack</option></select></label>
        <label className="flex flex-col gap-2 text-xs text-zinc-400">Technology<select className={control} value={technology} onChange={event => setTechnology(event.target.value)}><option value="all">Java / React / Python</option><option value="java">Java</option><option value="react">React</option><option value="python">Python</option></select></label>
      </div>
      <p className="mb-4 text-sm text-zinc-400">{visible.length} matching jobs · {matches.length} total mid-level matches</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(job => <article key={job.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <p className="text-sm font-semibold text-teal-300">{job.company}</p><h2 className="text-xl font-semibold">{job.title}</h2>
        <p className="text-sm text-zinc-400">{[job.location, job.workMode].filter(Boolean).join(" · ")}</p>
        <p className="text-xs text-teal-200">{job.track}</p>
        {job.stack ? <p className="text-xs leading-5 text-zinc-400">{job.stack}</p> : null}
        <p className="text-xs text-zinc-500">Listing: {job.listingStatus}{job.postedOn ? ` · Posted ${job.postedOn}` : ""}</p>
        <details className="text-sm text-zinc-400"><summary className="cursor-pointer text-teal-300">Preview job details</summary><p className="mt-3 leading-6">{job.sourceNotes || job.matchReason}</p>{job.eligibility ? <p className="mt-2">{job.eligibility}</p> : null}</details>
        {/^https?:\/\//i.test(job.url) ? <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-auto pt-3 text-sm font-semibold text-teal-300 hover:underline">View job posting<span className="sr-only"> (opens in a new tab)</span> ↗</a> : <p className="text-xs text-zinc-500">Posting link not saved</p>}
      </article>)}</div>
      {!visible.length ? <p className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">No saved jobs match these filters.</p> : null}
    </div>
  </main>;
}
