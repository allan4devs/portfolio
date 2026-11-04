import Image from "next/image";
import { Sparkles, Waves } from "lucide-react";

export function TasteHeader() {
  return <>
    <header className="flex items-center justify-between gap-4 border-b border-[#d9d6ce] pb-5">
      <div className="flex items-center gap-3"><div className="flex h-10 items-center overflow-hidden rounded-xl bg-white px-2 shadow-[4px_4px_0_#ffc857]"><Image src="/san-marcos-logo.svg" alt="San Marcos" width={123} height={32} priority /></div><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#6f777d]">BPSV-14 / Módulo 2</p><p className="text-sm font-bold">Laboratorio de percepción</p></div></div>
      <div className="hidden items-center gap-3 sm:flex"><span className="rounded-full border border-[#b9e7d8] bg-[#e8f8f2] px-3 py-1.5 text-xs font-black text-[#187a60]"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#25b88b]" />Experimento documentado</span><span className="text-xs font-bold text-[#7d8385]">25 OCT 2026</span></div>
    </header>
    <section className="grid gap-8 pb-10 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end"><div><p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#e36b4d]"><Sparkles className="h-4 w-4" /> Investigación de campo · datos de demostración</p><h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">¿Puede una etiqueta cambiar lo que <span className="text-[#e36b4d]">saboreamos?</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#697178] sm:text-lg">Cinco sabores, dos expectativas y ocho respuestas para observar cómo una palabra cambia la forma de contar lo que acabamos de probar.</p></div><div className="relative overflow-hidden rounded-[28px] bg-[#18222d] p-6 text-[#f8f5ef] shadow-[10px_10px_0_#ffc857] sm:p-8"><div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border-[18px] border-[#334452]" /><div className="relative"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffc857]">Pregunta guía</p><p className="mt-4 text-2xl font-black leading-tight">¿La palabra que vemos cambia la manera en que contamos lo que probamos?</p><div className="mt-6 flex items-center gap-3 text-sm font-bold text-[#aab6bc]"><Waves className="h-5 w-5 text-[#ffc857]" /> Dos etiquetas · una misma muestra</div></div></div></section>
  </>;
}
