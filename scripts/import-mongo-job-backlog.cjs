const fs = require("node:fs");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { MongoClient } = require("mongodb");

const root = path.resolve(__dirname, "..");
const normalize = (value) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const clean = (value) => typeof value === "string" ? value.trim() : "";
const isoDay = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
};

/** Only posting metadata leaves Mongo: no owners, CV results, profiles or provider output. */
function generationJob(record) {
  const description = clean(record.jobDescription);
  const lines = description.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const titleIndex = lines.findIndex((line) => line.length <= 180 && /\b(engineer|developer|architect|analyst|designer|consultant|scientist)\b/i.test(line) && !/[.!?]$/.test(line));
  const savedTitle = clean(record.jd?.title) || clean(record.title);
  const title = savedTitle && !/^(generating cv|untitled)$/i.test(savedTitle) ? savedTitle : lines[titleIndex];
  const preceding = clean(lines[titleIndex - 1]).replace(/\s+logo$/i, "");
  const company = clean(record.jd?.company) || clean(record.company) || (preceding.length <= 80 && !/^(banner|back|home|search|location|job|careers?)$/i.test(preceding) ? preceding : "");
  if (!title || !company || !record._id) return null;

  const possibleLocation = lines[titleIndex + 1] === "Location" ? lines[titleIndex + 2] : lines[titleIndex + 1];
  const location = possibleLocation?.length < 160 && /costa rica|heredia|remote|latam|latin america|americas|emea|international/i.test(possibleLocation) ? possibleLocation : "Location to verify";
  const skills = [...new Set((record.jd?.keywords ?? []).map((keyword) => clean(keyword.term)).filter(Boolean))];
  if (!skills.length) {
    for (const term of ["Java", "Spring Boot", "React", "Python", "TypeScript", "Node.js", "SQL", "AWS", "Azure", "GCP", "LangGraph", "LangChain", "RAG"]) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(description)) skills.push(term);
    }
  }
  const urls = [record.jobUrl, record.url, ...(description.match(/https?:\/\/[^\s<>"\]]+/g) ?? [])];
  const url = urls.map(clean).find((value) => /^https?:\/\//i.test(value) && /\/(?:jobs?|careers?|positions?|requisitions?)\/.+/i.test(value) && !/privacy|terms|policy/i.test(value)) ?? "";
  const id = `mongo:cv_generations:${record._id}`;
  return {
    id, sourceIds: [id], applicationSlug: `job-search/${id}`,
    company, title, location, url,
    match: "general", matchReason: "Job description recovered from a saved CV generation.",
    track: "Saved CV target", seniority: "", stack: skills.join(", "), eligibility: location === "Location to verify" ? "" : location,
    workMode: /remote/i.test(location) ? "Remote" : "", engagement: "", sourcePriority: "", locationFit: "",
    contractorSignal: "", preferenceExclusion: "", userSignal: "", sourceStatus: "", listingStatus: "unknown",
    // Generation timestamps establish discovery only, never a publication date or application status.
    firstSeen: isoDay(record.createdAt), lastSeen: isoDay(record.updatedAt || record.createdAt),
    nextStep: url ? "Verify the saved posting before applying." : "Add the posting URL and verify this saved job target.",
    recordQuality: "Saved job description; publication date and availability unverified",
    sources: "MongoDB cv_generations",
    sourceNotes: "Recovered from saved CV generation metadata. Generation completion or failure does not indicate application status.",
    initialStatus: "draft", initialPriority: 0, seeded: true, rating10: 0,
    ratingReason: "Not rated yet; imported from a saved job description.",
  };
}

function extractGenerationJobs(records) {
  const jobs = new Map();
  for (const record of [...records].sort((a, b) => (new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0) || String(a._id).localeCompare(String(b._id)))) {
    const job = generationJob(record);
    if (!job) continue;
    const key = `${normalize(job.company)}|${normalize(job.title)}`;
    const existing = jobs.get(key);
    if (!existing) jobs.set(key, job);
    else {
      existing.sourceIds.push(job.id);
      existing.applicationAliases = [...(existing.applicationAliases ?? []), job.applicationSlug];
      if (!existing.url) existing.url = job.url;
      if (job.stack.length > existing.stack.length) existing.stack = job.stack;
      if (job.lastSeen > existing.lastSeen) existing.lastSeen = job.lastSeen;
    }
  }
  return [...jobs.values()];
}

async function main() {
  loadEnvConfig(root, true, { info() {}, error() {} });
  if (!process.env.MONGODB_URI) throw new Error("Mongo configuration unavailable");
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 10_000 });
  try {
    await client.connect();
    const records = await client.db(process.env.MONGODB_DB || "lva").collection("cv_generations").find({}, {
      projection: { _id: 1, title: 1, company: 1, jobDescription: 1, "jd.title": 1, "jd.company": 1, "jd.keywords.term": 1, createdAt: 1, updatedAt: 1, jobUrl: 1, url: 1 },
    }).toArray();
    const jobs = extractGenerationJobs(records);
    const text = "// Generated by node scripts/import-mongo-job-backlog.cjs; job metadata only.\n"
      + 'import type { JobLead } from "../java-react-jobs-types";\n\n'
      + `export const MONGO_BACKLOG_IMPORT_STATS = ${JSON.stringify({ recordsRead: records.length, distinctJobs: jobs.length })} as const;\n\n`
      + `export const MONGO_BACKLOG_JOBS: readonly JobLead[] = ${JSON.stringify(jobs, null, 2)};\n`;
    fs.writeFileSync(path.join(root, "app/jobs/data/job-mongo-imports.ts"), text, "utf8");
    console.log(JSON.stringify({ recordsRead: records.length, distinctJobs: jobs.length, output: "app/jobs/data/job-mongo-imports.ts" }));
  } finally {
    await client.close();
  }
}

module.exports = { generationJob, extractGenerationJobs };
if (require.main === module) main().catch((error) => { console.error(`Mongo backlog import failed (${error.name}).`); process.exitCode = 1; });
