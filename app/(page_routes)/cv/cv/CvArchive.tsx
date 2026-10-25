import Link from "next/link";
import { cvVariants } from "../variants";

export function CvArchive() {
  return <main className="min-h-screen bg-[#f5f4f0] px-5 py-12 text-zinc-900"><div className="mx-auto max-w-4xl">
    <Link href="/jobs" className="text-sm text-zinc-500 hover:text-zinc-900">Back to jobs</Link>
    <h1 className="mt-8 text-4xl font-semibold tracking-tight">Your CV archive</h1>
    <p className="mt-4 max-w-2xl text-zinc-600">Older saved CV versions, kept separate from your job search archive.</p>
    <div className="mt-8 grid gap-3 sm:grid-cols-2">{cvVariants.map((variant) => <Link key={variant.slug} href={variant.path} className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-400">
      <p className="text-sm font-semibold">{variant.name}</p><p className="mt-2 text-xs leading-relaxed text-zinc-500">{variant.role}</p>
      {variant.company && <p className="mt-2 text-xs text-teal-700">{variant.company}</p>}
    </Link>)}</div>
    <nav className="mt-8 flex flex-wrap gap-5 text-sm text-zinc-500"><Link href="/cv">CV workspace</Link><Link href="/cv/cover-letter">Cover letter editor</Link><Link href="/cv/stats">CV word budgets</Link></nav>
  </div></main>;
}
