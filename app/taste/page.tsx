"use client";

import { ConclusionPanel } from "./components/ConclusionPanel";
import { MethodPanel } from "./components/MethodPanel";
import { OverviewPanel } from "./components/OverviewPanel";
import { ParticipantsPanel } from "./components/ParticipantsPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { TasteHeader } from "./components/TasteHeader";
import { TasteTabs } from "./components/TasteTabs";
import { TasteProvider, useTasteContext } from "./context/TasteContext";

export default function TastePage() {
  return <TasteProvider><TasteScreen /></TasteProvider>;
}

function TasteScreen() {
  const { activeTab, selectTab } = useTasteContext();
  return <main className="min-h-screen bg-[#f8f5ef] text-[#18222d] selection:bg-[#ffc857] selection:text-[#18222d]"><div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-8 lg:px-12"><TasteHeader /><TasteTabs activeTab={activeTab} onSelect={selectTab} /><TasteContent tab={activeTab} /><footer className="mt-12 flex flex-col justify-between gap-3 border-t border-[#d9d6ce] pt-5 text-xs text-[#7d8385] sm:flex-row"><p>Registro ilustrativo · participantes y respuestas inventados para completar la presentación visual.</p><p className="font-bold">APA 7 · lectura de apoyo incluida en la entrega</p></footer></div></main>;
}

function TasteContent({ tab }: { tab: "overview" | "people" | "results" | "method" | "conclusion" }) {
  if (tab === "people") return <ParticipantsPanel />;
  if (tab === "results") return <ResultsPanel />;
  if (tab === "method") return <MethodPanel />;
  if (tab === "conclusion") return <ConclusionPanel />;
  return <OverviewPanel />;
}
