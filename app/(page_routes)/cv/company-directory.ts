import researchedCompanies from "./data/latam-company-research.json";
import { outsourcingDomains } from "./data/company-models.json";
import websites from "./data/company-websites.json";
import { jobCompanyKey } from "./java-react-jobs-audit";
import type { JobLead } from "./java-react-jobs-types";

export type CompanyCard = { key: string; name: string; names: string[]; website?: string; tracks: string[]; locations: string[]; records: number; jobs: JobLead[]; research?: (typeof researchedCompanies)[number] };
const catalog: Record<string, { url: string; source: string }> = websites;
// Editorial shortlist of recognizable employers; independent of stock-market listing.
const knownCompanies = new Set([
  "3M", "Accenture", "Akamai", "Align Technology", "Amazon", "Automattic", "BairesDev",
  "Bosch", "Broadcom", "Canonical", "Capgemini", "Cisco", "Cloudflare", "Cognizant",
  "Databricks", "Deel", "Docker", "DXC Technology", "Elastic", "Emerson", "Encora",
  "Endava", "EPAM", "Equifax", "Experian", "Fiserv", "GitLab", "Globant", "Gorilla Logic",
  "Grafana Labs", "HCLTech", "Hewlett Packard Enterprise", "HP Inc.", "IBM", "Intel",
  "Microsoft", "MongoDB", "Moody's", "NTT DATA", "OpenText", "Palo Alto Networks",
  "Publicis Sapient", "ServiceNow", "Smartsheet", "Splunk", "Stryker", "Thoughtworks",
  "TransUnion", "Unisys", "Walmart Global Tech", "Zscaler", "Cargill", "Fujitsu",
  "Concentrix", "EY", "Deloitte", "Citi", "Brex", "Toptal", "Turing",
].map(companyKey));
export type CompanyModel = "outsourcing" | "direct";
// Classify the employer's primary model, not the contract type of an individual job.
// Match canonical homepages so country labels and alternate company names stay together.
const outsourcingWebsites = new Set(outsourcingDomains);
const outsourcingNames = new Set(Object.keys(catalog).filter(name => {
  const website = companyWebsite(name);
  return website && outsourcingWebsites.has(new URL(website).hostname.replace(/^www\./, ""));
}).map(companyKey));
// Saved leads without a cataloged homepage, including recruiter-mediated listings.
for (const name of ["BC Tecnolog\u00eda", "Beyond Solu\u00e7\u00f5es", "GO | Tech Talent", "\u00edlia", "Find Job Latam", "Careerswift", "Pearl", "Performa Centric", "LPS"]) outsourcingNames.add(companyKey(name));
export function companyModel(company: CompanyCard): CompanyModel {
  if (company.research) return company.research.model === "outsourcing" ? "outsourcing" : "direct";
  const hostname = company.website ? new URL(company.website).hostname.replace(/^www\./, "") : "";
  return outsourcingWebsites.has(hostname) || company.names.some(name => outsourcingNames.has(companyKey(name)) || /^(accenture|capgemini)\b|\bbc tecnolog|recruiter outreach/.test(companyKey(name))) ? "outsourcing" : "direct";
}
export function isKnownCompany(company: CompanyCard): boolean {
  return company.names.some(name => knownCompanies.has(companyKey(name)));
}
export function companyHiringRegions(company: CompanyCard): string[] {
  const text = companyKey(company.locations.join(" "));
  const costaRica = /\bcosta rica\b/.test(text);
  const latam = costaRica || /\b(latam|latin america|latin american|latinoamerica|america latina|argentina|brazil|brasil|mexico|colombia|chile|peru|uruguay|ecuador|guatemala|panama|el salvador|honduras|nicaragua|bolivia|paraguay|venezuela|dominican republic)\b/.test(text);
  return [...(costaRica ? ["cr"] : []), ...(latam ? ["latam"] : [])];
}
export function companyKey(name: string): string {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function companyWebsite(name: string): string | undefined {
  const entry = catalog[name];
  if (!entry) return undefined;
  try {
    const url = new URL(entry.url);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return undefined;
    if (/(^|\.)(linkedin\.com|ashbyhq\.com|greenhouse\.io|lever\.co|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|careers-page\.com)$/.test(url.hostname)) return undefined;
    if (/^(jobs|careers|career|applicants)\./.test(url.hostname)) return undefined;
    return url.href;
  } catch { return undefined; }
}
/** Tracking parameters and fragments do not identify a different vacancy. */
export function companyJobKey(job: JobLead): string {
  try {
    const url = new URL(job.url);
    if (/^https?:$/.test(url.protocol)) {
      url.hash = "";
      for (const key of [...url.searchParams.keys()]) {
        if (/^(utm_|gh_src$|source$|ref$|referrer$|tracking|trk$)/i.test(key)) url.searchParams.delete(key);
      }
      url.searchParams.sort();
      const path = url.pathname.replace(/\/+$/, "");
      if (path && !/^\/(careers|jobs)$/i.test(path)) return url.hostname.toLowerCase().replace(/^www\./, "") + path + url.search;
    }
  } catch { /* Missing posting URLs fall back to the role and location. */ }
  return [jobCompanyKey(job.company), companyKey(job.title), companyKey(job.location)].join("|");
}
/** Group all records, including archive, by the explicitly cataloged homepage. */
export function buildCompanyDirectory(jobs: JobLead[]): CompanyCard[] {
  const groups = new Map<string, CompanyCard>();
  const companyAliases = new Map<string, string>();
  for (const job of jobs) {
    const website = companyWebsite(job.company);
    if (website) companyAliases.set(jobCompanyKey(job.company), new URL(website).hostname.replace(/^www\./, ""));
  }
  for (const job of jobs) {
    if (!job.company.trim()) continue;
    const website = companyWebsite(job.company);
    const key = website ? new URL(website).hostname.replace(/^www\./, "") : companyAliases.get(jobCompanyKey(job.company)) ?? jobCompanyKey(job.company);
    const company = groups.get(key) ?? { key, name: job.company, names: [], website, tracks: [], locations: [], records: 0, jobs: [] };
    // Keep every distinct role, but collapse repeat imports of the same posting.
    const duplicate = company.jobs.find(existing => companyJobKey(existing) === companyJobKey(job));
    if (!duplicate) {
      company.records++;
      company.jobs.push(job);
    }
    if (!company.names.includes(job.company)) company.names.push(job.company);
    if (job.track && !company.tracks.includes(job.track)) company.tracks.push(job.track);
    if (job.location && !company.locations.includes(job.location)) company.locations.push(job.location);
    groups.set(key, company);
  }
  for (const research of researchedCompanies) {
    const website = research.website || companyWebsite(research.company);
    const key = website ? new URL(website).hostname.replace(/^www\./, "") : companyKey(research.company);
    const company = groups.get(key) ?? [...groups.values()].find(item => item.names.some(name => companyKey(name) === companyKey(research.company))) ?? { key, name: research.company, names: [research.company], website, tracks: [], locations: [], records: 0, jobs: [] };
    company.research = research;
    if (!company.tracks.includes(research.track)) company.tracks.push(research.track);
    if (!company.locations.includes(research.region)) company.locations.push(research.region);
    groups.set(company.key, company);
  }
  for (const company of groups.values()) {
    if (!company.website) company.website = company.names.map(companyWebsite).find(Boolean);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function filterCompanies(companies: CompanyCard[], query: string, track: string, availability: string, recognition = "all", region = "all"): CompanyCard[] {
  const words = companyKey(query).split(" ").filter(Boolean);
  return companies.filter(company => {
    const text = companyKey([company.name, ...company.names, company.website ?? "", ...company.tracks, ...company.locations].join(" "));
    return words.every(word => text.includes(word)) && (track === "all" || company.tracks.includes(track))
      && (availability === "all" || (availability === "linked" ? Boolean(company.website) : !company.website))
      && (recognition === "all" || isKnownCompany(company))
      && (region === "all" || companyHiringRegions(company).includes(region));
  });
}
