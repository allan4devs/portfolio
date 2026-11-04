import type { ReactNode } from "react";

import { flavorStudies } from "../flavorStudies";

export function MetricCard({ label, value, detail, icon, tone = "yellow" }: { label: string; value: string; detail: string; icon: ReactNode; tone?: "yellow" | "coral" | "green" | "blue" }) {
  const tones = { yellow: "bg-[#fff4d0] text-[#9b7417]", coral: "bg-[#fff0ec] text-[#d55d46]", green: "bg-[#e9f6f1] text-[#25846b]", blue: "bg-[#edf3fa] text-[#4d7294]" };
  return <section className="rounded-[20px] border border-[#dedbd3] bg-white p-4"><div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div><p className="text-xs font-black uppercase tracking-wider text-[#8a9194]">{label}</p><p className="mt-1 text-3xl font-black tracking-[-0.05em]">{value}</p><p className="mt-1 text-xs leading-5 text-[#7d8385]">{detail}</p></section>;
}

export function ProgressBar({ label, value, color, note, animated = false }: { label: string; value: number; color: string; note?: string; animated?: boolean }) {
  return <div><div className="mb-2 flex justify-between gap-3 text-sm font-black"><span>{label}</span><span>{value}%</span></div><div className="h-4 overflow-hidden rounded-full bg-[#f0eee8]"><div className={`h-full rounded-full transition-all duration-700 ${animated ? "animate-pulse" : ""}`} style={{ width: `${value}%`, backgroundColor: color }} /></div>{note && <p className="mt-2 text-xs text-[#7d8385]">{note}</p>}</div>;
}

export function FlavorSelector({ selectedId, onSelect, compact = false }: { selectedId: string; onSelect: (id: string) => void; compact?: boolean }) {
  return <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-5" : "sm:grid-cols-5"}`}>{flavorStudies.map((flavor) => <button key={flavor.id} onClick={() => onSelect(flavor.id)} className={`rounded-2xl border p-3 text-left transition ${selectedId === flavor.id ? "border-[#18222d] bg-white shadow-[4px_4px_0_#ffc857]" : "border-[#ddd9cf] bg-[#faf9f6] hover:bg-white"}`}><span className="mb-3 block h-3 w-3 rounded-full" style={{ backgroundColor: flavor.color }} /><p className="text-sm font-black">{flavor.actual}</p><p className="mt-1 text-xs text-[#7d8385]">vs. {flavor.suggested}</p></button>)}</div>;
}
