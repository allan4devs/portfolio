import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isCvSlug } from "../data/cv-data";
import { cvVariantBySlug, cvVariants } from "../variants";

const FEATURE_ROUTES = ["cover-letter", "jobs/comp", "jobs/mid-level", "jobs", "java-react-jobs", "stats", "archive", "cv-archive", "profile", "scraper"] as const;

export const dynamicParams = true;

export function generateStaticParams() {
  return [
    ...cvVariants.filter((variant) => variant.slug).map((variant) => ({
      slug: variant.slug.split("/"),
    })),
    ...cvVariants.map((variant) => ({ slug: ["cv-archive", ...(variant.slug || "master").split("/")] })),
    ...FEATURE_ROUTES.map((route) => ({ slug: route.split("/") })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const route = (await params).slug.join("/");

  if (route.startsWith("generated/")) return { title: "Generated CV", robots: { index: false, follow: false } };
  if (route === "archive") return { title: "Job Archive | Seen & Archived", robots: { index: false, follow: false } };
  if (route === "cv-archive") return { title: "Saved CV Archive", robots: { index: false, follow: false } };
  if (route === "profile") return { title: "My CV Experience", robots: { index: false, follow: false } };
  if (["scraper", "scrapper", "srapper"].includes(route)) return { title: "CV Job & Form Scanner", robots: { index: false, follow: false } };

  if (route === "jobs/mid-level") return { title: "Semi-senior / Mid-level jobs | CV", robots: { index: false, follow: false } };
  if (route === "jobs/comp") return { title: "Company directory | CV", robots: { index: false, follow: false } };
  if (route === "cover-letter") return { title: "Cover letter editor" };
  if (route === "jobs" || route === "java-react-jobs") {
    return {
      title: "All Software Jobs | Application Tracker",
      description: "A local application tracker for every consolidated software opportunity.",
    };
  }
  if (route === "stats") return { title: "CV word budgets" };

  const archiveSlug = route.startsWith("cv-archive/") ? route.slice(11) : route.startsWith("archive/") ? route.slice(8) : route;
  const variant = cvVariantBySlug(archiveSlug === "master" ? "" : archiveSlug);
  return variant ? { title: `${variant.name} | CV` } : {};
}

export default async function CvSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const route = (await params).slug.join("/");

  if (route === "srapper" || route === "scrapper") redirect("/cv/scraper");
  if (route === "scraper") {
    const { CvScraper } = await import("../cv/CvScraper");
    return <CvScraper />;
  }

  if (route === "profile") {
    const { getAdminFromCookies } = await import("@/lib/admin-auth");
    if (!await getAdminFromCookies()) redirect("/cv");
    const { CvProfileEditor } = await import("../cv/CvProfileEditor");
    return <CvProfileEditor />;
  }

  if (route === "jobs/mid-level") {
    const { MidLevelJobs } = await import("../components/MidLevelJobs");
    return <MidLevelJobs />;
  }
  if (route === "jobs/comp") redirect("/comp");
  if (route === "archive") redirect("/comp");
  if (route === "jobs") {
    const { JavaReactJobsClient } = await import("../components/JavaReactJobsClient");
    return <JavaReactJobsClient view="active" />;
  }
  if (route === "cv-archive") {
    const { CvArchive } = await import("../cv/CvArchive");
    return <CvArchive />;
  }
  if (route.startsWith("generated/")) {
    const id = route.slice(10);
    if (id.includes("/")) notFound();
    const { CvGeneratedPage } = await import("../cv/CvGeneratedPage");
    return <CvGeneratedPage id={id} />;
  }
  if (route.startsWith("cv-archive/") || route.startsWith("archive/")) {
    const archived = route.startsWith("cv-archive/") ? route.slice(11) : route.slice(8);
    const slug = archived === "master" ? "" : archived;
    if (!isCvSlug(slug)) notFound();
    const { CvRoute } = await import("../cv/CvRoute");
    return <CvRoute slug={slug} />;
  }

  if (route === "cover-letter") {
    const { CoverLetterWorkspace } = await import("../cover/CoverLetterWorkspace");
    return <CoverLetterWorkspace />;
  }
  if (route === "java-react-jobs") {
    redirect("/cv/jobs");
  }
  if (route === "stats") {
    const { default: CvStatsPage } = await import("../cv/CvStatsPage");
    return <CvStatsPage />;
  }
  if (!isCvSlug(route)) notFound();

  redirect(`/cv/cv-archive/${route}`);
}
