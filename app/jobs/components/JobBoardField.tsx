import type { ReactNode } from "react";

export function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
