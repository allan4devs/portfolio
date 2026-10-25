export const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

export const STAT_TONE_CLASS = {
  teal: "border-teal-500/20 bg-teal-500/10 text-teal-300",
  sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
} as const;

export type StatTone = keyof typeof STAT_TONE_CLASS;

export const MATCH_LABEL = {
  tailored: "Tailored CV",
  strong: "Strong CV match",
  general: "General CV",
} as const;

export const MATCH_CLASS = {
  tailored: "bg-teal-500/10 text-teal-300",
  strong: "bg-emerald-500/10 text-emerald-300",
  general: "bg-amber-500/10 text-amber-300",
} as const;
