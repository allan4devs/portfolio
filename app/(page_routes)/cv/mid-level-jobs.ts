import type { JobLead } from "./java-react-jobs-types";

export function isMidLevelJob(job: JobLead): boolean {
  const level = `${job.title} ${job.seniority}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mid = /\b(semi[ -]?senior|semi[ -]?sr|ssr|mid(?:dle)?(?:[ -]?level)?|intermediate|intermedio|pleno|nivel ii|level ii)\b/.test(level);
  const remaining = level.replace(/\b(semi[ -]?senior|semi[ -]?sr|ssr)\b/g, "");
  if (!mid || /\b(senior|sr|lead|principal|staff|architect|junior|jr|intern)\b/.test(remaining)) return false;
  return /\b(java|react(?:js)?|python)\b/i.test(`${job.title} ${job.stack} ${job.track}`);
}

export function jobDevelopmentArea(job: JobLead): "frontend" | "backend" | "fullstack" | "other" {
  const text = `${job.title} ${job.track}`.toLowerCase();
  if (/full[ -]?stack/.test(text)) return "fullstack";
  if (/front[ -]?end|react/.test(text)) return "frontend";
  if (/back[ -]?end|java|python/.test(text)) return "backend";
  return "other";
}
