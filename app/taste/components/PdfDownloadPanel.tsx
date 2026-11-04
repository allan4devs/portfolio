import { Download } from "lucide-react";

import { useTasteContext } from "../context/TasteContext";
import { downloadTastePdf } from "../pdf";

export function PdfDownloadPanel() {
  const { effect, selectedFlavor } = useTasteContext();
  return <section className="mt-5 rounded-[24px] border-2 border-dashed border-[#e0b43f] bg-[#fff9e8] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b7417]">Entrega final</p><h2 className="mt-2 text-2xl font-black text-[#18222d]">Descargar trabajo completo en PDF</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#697178]">Incluye portada, muestras, método, respuestas individuales, resultados, conclusiones y referencias APA 7.</p></div><button type="button" onClick={() => downloadTastePdf(effect, selectedFlavor)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#18222d] px-5 py-3.5 text-sm font-black text-white shadow-[4px_4px_0_#ffc857] transition hover:-translate-y-0.5 hover:bg-[#273746]"><Download className="h-5 w-5 text-[#ffc857]" /> Descargar PDF</button></div><p className="mt-4 text-xs font-bold text-[#9b7417]">Sabor comparado: {selectedFlavor.actual} vs. {selectedFlavor.suggested}.</p></section>;
}
