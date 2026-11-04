import { tabs } from "../navigation";
import type { Tab } from "../types";

export function TasteTabs({ activeTab, onSelect }: { activeTab: Tab; onSelect: (tab: Tab) => void }) {
  return <nav className="mb-8 flex gap-2 overflow-x-auto border-y border-[#d9d6ce] py-3" aria-label="Secciones de la investigación">{tabs.map((tab) => <button key={tab.id} onClick={() => onSelect(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${activeTab === tab.id ? "bg-[#18222d] text-white shadow-[3px_3px_0_#ffc857]" : "text-[#70787d] hover:bg-white"}`}><span className={activeTab === tab.id ? "text-[#ffc857]" : "text-[#a3a7a6]"}>{tab.short}</span>{tab.label}</button>)}</nav>;
}
