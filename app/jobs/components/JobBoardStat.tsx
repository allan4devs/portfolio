import { STAT_TONE_CLASS, type StatTone } from "../java-react-jobs-values";

export function Stat({ label, value, tone }: { label: string; value: string | number; tone: StatTone }) {
  return (
    <div className={`min-w-28 rounded-xl border px-3 py-2 ${STAT_TONE_CLASS[tone]}`}>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}
