"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import type { JobAvailabilityResult, JobAvailabilityStatus } from "@/lib/cv/job-availability/types";

const LABEL: Record<JobAvailabilityStatus, string> = {
  open: "Appears available",
  closed: "No longer available",
  blocked: "Blocked — couldn't verify",
  unknown: "Couldn't verify",
};
const TONE: Record<JobAvailabilityStatus, string> = {
  open: "border-emerald-600/40 bg-emerald-500/5 text-emerald-300",
  closed: "border-rose-600/40 bg-rose-500/5 text-rose-300",
  blocked: "border-amber-600/40 bg-amber-500/5 text-amber-300",
  unknown: "border-zinc-700 bg-zinc-950/50 text-zinc-300",
};

export function JobAvailabilityCheck({ url, title }: { url: string; title: string }) {
  const [result, setResult] = useState<JobAvailabilityResult | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);

  function cancel() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setChecking(false);
    setSigningIn(false);
    setError("Check cancelled.");
  }

  async function check() {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);
    setChecking(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, mode: "availability" }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json() as JobAvailabilityResult | { error: string };
      if (activeRequest.current !== controller) return;
      setNeedsLogin(response.status === 401);
      if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : "The check failed. Open the Job link to verify manually.");
      setResult(data);
    } catch (cause) {
      if (activeRequest.current !== controller) return;
      setError(timedOut ? "The check timed out. Availability is unknown; open the Job link to check manually."
        : cause instanceof Error ? cause.message : "Couldn't check availability. Open the Job link manually.");
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setChecking(false);
      }
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    setSigningIn(true);
    setError("");
    let signedIn = false;
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
        signal: controller.signal,
      });
      const data = await response.json() as { error?: string };
      if (activeRequest.current !== controller) return;
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      setNeedsLogin(false);
      signedIn = true;
    } catch (cause) {
      if (activeRequest.current === controller) setError(controller.signal.aborted ? "Sign-in timed out. Try again." : cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setSigningIn(false);
      }
    }
    if (signedIn) await check();
  }

  return <div className="border-t border-zinc-800/70 px-3 py-2">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={check} disabled={checking || signingIn} aria-label={`Check availability for ${title || "this job"}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-700/60 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/10 disabled:opacity-60">
        {checking || signingIn ? <Loader2 size={13} className="animate-spin" /> : <ScanSearch size={13} />}
        {signingIn ? "Signing in…" : checking ? "Checking page…" : "Check availability"}
      </button>
      {checking || signingIn ? <button type="button" onClick={cancel} className="min-h-9 px-2 text-xs text-zinc-400 hover:text-white">Cancel</button> : null}
      <span className="text-[11px] text-zinc-500">Page text + keyword rules · no AI</span>
    </div>
    {error ? <p role="status" className="mt-2 text-xs text-amber-300">{error}</p> : null}
    {needsLogin ? <form onSubmit={signIn} className="mt-3 rounded-lg border border-zinc-700 p-3">
      <p className="text-xs font-semibold text-zinc-300">Sign in with your scanner admin account to check this link.</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-zinc-400">Username<input name="username" required autoComplete="username" disabled={checking || signingIn} className="mt-1 block min-h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm text-white" /></label>
        <label className="text-[11px] text-zinc-400">Password<input name="password" type="password" required autoComplete="current-password" disabled={checking || signingIn} className="mt-1 block min-h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm text-white" /></label>
        <button type="submit" disabled={checking || signingIn} className="min-h-9 rounded border border-sky-700 px-3 text-xs font-semibold text-sky-300 disabled:opacity-50">Sign in and check</button>
      </div>
    </form> : null}
    {result ? <div className={`mt-2 rounded-lg border p-3 text-xs ${TONE[result.status]}`} role="status">
      <div className="flex flex-wrap items-center gap-2"><strong>{LABEL[result.status]}</strong><span className="text-[10px] text-zinc-500">Checked {new Date(result.checkedAt).toLocaleString()}{result.httpStatus !== null ? ` · HTTP ${result.httpStatus}` : ""}</span></div>
      <p className="mt-1 leading-relaxed">{result.reason}</p>
      {result.evidence.length ? <p className="mt-1 break-words text-zinc-400">Matched: {result.evidence.map((value) => `“${value}”`).join(", ")}</p> : null}
      <p className="mt-2 text-[11px] text-zinc-500">Mark Seen or Archived when finished. This check does not change your job status.</p>
      {result.pageText ? <details className="mt-2 text-zinc-400"><summary className="cursor-pointer font-semibold">Extracted page text ({result.pageText.length.toLocaleString()} characters)</summary><p className="mt-2 break-all text-[11px]">{result.url}</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-zinc-950 p-3 font-sans text-[11px] leading-relaxed">{result.pageText}</pre></details> : null}
    </div> : null}
  </div>;
}
