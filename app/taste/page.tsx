"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Beaker,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  FlaskConical,
  GitBranch,
  Lightbulb,
  Pause,
  Play,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";

import { flavorStudies, flowSteps, groupLabel, participants, tabs } from "./data";
import { downloadTastePdf } from "./pdf";

type Group = "all" | "control" | "experimental";
type Tab = "overview" | "people" | "results" | "method" | "conclusion";

type Participant = {
  id: string;
  name: string;
  age: number;
  group: Exclude<Group, "all">;
  sample: string;
  actual: string;
  label: string;
  perceived: string;
  confidence: number;
  note: string;
  color: string;
};

type FlavorStudy = {
  id: string;
  actual: string;
  color: string;
  aroma: string;
  suggested: string;
  controlWords: string[];
  experimentalWords: string[];
  conclusion: string;
};

/* const legacyParticipants: Participant[] = [
  { id: "ana", name: "Ana M.", age: 24, group: "control", sample: "C-01", actual: "Limón", label: "Limón", perceived: "Ácido y fresco", confidence: 92, note: "Identificó el sabor esperado sin dudar.", color: "#f5b82e" },
  { id: "bruno", name: "Bruno R.", age: 29, group: "control", sample: "C-02", actual: "Fresa", label: "Fresa", perceived: "Dulce, frutal", confidence: 88, note: "Describió aroma y sabor de manera consistente.", color: "#f06c78" },
  { id: "carla", name: "Carla V.", age: 32, group: "control", sample: "C-03", actual: "Café", label: "Café", perceived: "Amargo y tostado", confidence: 86, note: "La expectativa coincidió con la muestra real.", color: "#9b6a4a" },
  { id: "diego", name: "Diego S.", age: 26, group: "control", sample: "C-04", actual: "Menta", label: "Menta", perceived: "Fresco y herbal", confidence: 90, note: "Reconoció la sensación de frescor inmediatamente.", color: "#3bc7a4" },
  { id: "elena", name: "Elena P.", age: 27, group: "experimental", sample: "E-01", actual: "Limón", label: "Manzana verde", perceived: "Dulce y verde", confidence: 78, note: "La etiqueta dulce desplazó la respuesta ácida.", color: "#a4d65e" },
  { id: "fabian", name: "Fabián C.", age: 31, group: "experimental", sample: "E-02", actual: "Fresa", label: "Sandía", perceived: "Acuoso y suave", confidence: 71, note: "Buscó una explicación compatible con la etiqueta.", color: "#f07a70" },
  { id: "gabriela", name: "Gabriela T.", age: 23, group: "experimental", sample: "E-03", actual: "Café", label: "Chocolate", perceived: "Amargo, pero achocolatado", confidence: 64, note: "Notó el amargor, aunque lo interpretó como chocolate.", color: "#9b6a4a" },
  { id: "hector", name: "Héctor J.", age: 35, group: "experimental", sample: "E-04", actual: "Menta", label: "Albahaca", perceived: "Herbal, poco fresco", confidence: 59, note: "La sugerencia redujo la mención espontánea de menta.", color: "#63b86f" },
];

*/
/* const legacyFlavorStudies: FlavorStudy[] = [
  { id: "limon", actual: "Limón", color: "#f5b82e", aroma: "cítrico", suggested: "Manzana verde", controlWords: ["ácido", "fresco", "intenso"], experimentalWords: ["dulce", "verde", "suave"], conclusion: "La etiqueta dulce suavizó la expectativa de acidez." },
  { id: "fresa", actual: "Fresa", color: "#f06c78", aroma: "frutal", suggested: "Sandía", controlWords: ["dulce", "frutal", "rojo"], experimentalWords: ["acuoso", "ligero", "fresco"], conclusion: "La etiqueta desplazó la atención del aroma hacia la textura." },
  { id: "cafe", actual: "Café", color: "#9b6a4a", aroma: "tostado", suggested: "Chocolate", controlWords: ["amargo", "tostado", "caliente"], experimentalWords: ["amargo", "dulce", "achocolatado"], conclusion: "El amargor resistió, pero fue explicado con otra referencia." },
  { id: "menta", actual: "Menta", color: "#3bc7a4", aroma: "herbal", suggested: "Albahaca", controlWords: ["fresco", "frío", "herbal"], experimentalWords: ["herbal", "verde", "poco fresco"], conclusion: "La sugestión redujo la mención espontánea de frescor." },
];

*/
/* const legacyFlowSteps = [
  { title: "Preparar", label: "Muestra idéntica", detail: "La misma cantidad llega a ambos grupos." },
  { title: "Nombrar", label: "Etiqueta visible", detail: "La palabra activa una expectativa." },
  { title: "Probar", label: "Primera reacción", detail: "Se registra la frase espontánea." },
  { title: "Decidir", label: "Nivel de confianza", detail: "Cada persona sostiene o ajusta su lectura." },
]; */

/* Legacy PDF implementation kept out of the page after extraction to pdf.ts.
function pdfSafeText(value: string) {
  return value
    .replace(/[áàäâ]/gi, (letter) => letter === letter.toUpperCase() ? "A" : "a")
    .replace(/[éèëê]/gi, (letter) => letter === letter.toUpperCase() ? "E" : "e")
    .replace(/[íìïî]/gi, (letter) => letter === letter.toUpperCase() ? "I" : "i")
    .replace(/[óòöô]/gi, (letter) => letter === letter.toUpperCase() ? "O" : "o")
    .replace(/[úùüû]/gi, (letter) => letter === letter.toUpperCase() ? "U" : "u")
    .replace(/ñ/gi, (letter) => letter === letter.toUpperCase() ? "N" : "n")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/·/g, "-");
}

function pdfEscape(value: string) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfText(value: string, width = 92) {
  const words = pdfSafeText(value).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    if ((current + " " + word).trim().length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}

function buildPdfBinary(pages: string[][]) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageObjectNumbers: number[] = [];
  pages.forEach((lines) => {
    const content = ["BT", "/F1 11 Tf", "72 760 Td", ...lines.map((line, index) => `${index ? "0 -16 Td " : ""}(${pdfEscape(line)}) Tj`), "ET"].join("\n");
    const contentObjectNumber = objects.length + 1;
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageObjectNumber = objects.length + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    pageObjectNumbers.push(pageObjectNumber);
  });
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Array.from(pdf, (character) => character.charCodeAt(0)));
}

function makeTastePdf({ effect, selectedFlavor }: { effect: number; selectedFlavor: FlavorStudy }) {
  const pages: string[][] = [];
  const addPage = (title: string, sections: string[]) => {
    const lines = ["BPSV-14 - ATENCION, SENSACION Y PERCEPCION", "", title, "", ...sections.flatMap((section) => [...wrapPdfText(section), ""])];
    pages.push(lines.slice(0, 44));
  };

  addPage("EFECTO DE LA SUGESTION EN LA PERCEPCION GUSTATIVA", [
    "Trabajo de campo - Modulo 2", "", "Estudiante: ______________________________", "Curso: BPSV-14", "Fecha: 25 de octubre de 2026", "", "Documento generado desde el Laboratorio de percepcion gustativa.", "", "Nota: los participantes, respuestas y resultados de esta recreacion son datos ficticios de demostracion para completar la presentacion visual.",
  ]);
  addPage("1. INTRODUCCION", [
    "La percepcion gustativa no depende unicamente de las sustancias que entran en contacto con la lengua. Antes y durante la prueba, la persona interpreta senales visuales, palabras, recuerdos y expectativas. Por eso, una etiqueta puede orientar la forma en que se describe un sabor, incluso cuando la muestra fisica permanece igual.",
    "Este trabajo presenta una recreacion de un experimento de campo sobre el efecto de la sugestion en la percepcion gustativa. Se comparo un grupo control, que recibio etiquetas correctas, con un grupo experimental, que recibio nombres alternativos para las mismas familias de muestras.",
    "La pregunta guia fue: puede una palabra presentada antes de probar modificar la descripcion y la confianza con que una persona sostiene su respuesta? El recorrido visual registra el proceso desde la muestra hasta la conclusion.",
  ]);
  addPage("2. OBJETIVOS Y METODO", [
    "Objetivo general: identificar como la sugestion puede influir en la percepcion y en el lenguaje utilizado para describir un sabor.",
    "Objetivos especificos: comparar dos grupos; registrar la primera respuesta; observar el nivel de confianza; y analizar semejanzas y diferencias entre sabores.",
    "Participaron ocho personas ficticias, organizadas en dos grupos de cuatro. Se trabajaron cuatro muestras: limon, fresa, cafe y menta. El grupo control vio el nombre real. El grupo experimental vio, respectivamente, manzana verde, sandia, chocolate y albahaca.",
    "Cada persona recibio una cantidad equivalente, dijo su primera impresion y asigno una confianza de 0 a 100. La observacion se organizo en cuatro momentos: preparar, nombrar, probar y decidir.",
  ]);
  addPage("3. REGISTRO DE PARTICIPANTES", participants.map((person) => `${person.name} | ${groupLabel(person.group)} | ${person.sample} | Real: ${person.actual} | Etiqueta: ${person.label} | Primera respuesta: ${person.perceived} | Confianza: ${person.confidence}%`));
  addPage("4. RESULTADOS Y COMPARACION", [
    `Promedio de confianza del grupo control: ${Math.round(participants.filter((person) => person.group === "control").reduce((sum, person) => sum + person.confidence, 0) / 4)}%.`,
    `Promedio de confianza del grupo experimental: ${Math.round(participants.filter((person) => person.group === "experimental").reduce((sum, person) => sum + person.confidence, 0) / 4)}%.`,
    `Brecha observada entre grupos: ${effect} puntos porcentuales.`,
    `Sabor seleccionado en la pagina al descargar: ${selectedFlavor.actual}.`,
    `Comparacion activa: sabor real ${selectedFlavor.actual} frente a etiqueta sugestiva ${selectedFlavor.suggested}.`,
    `Palabras del control: ${selectedFlavor.controlWords.join(", ")}.`,
    `Palabras del grupo experimental: ${selectedFlavor.experimentalWords.join(", ")}.`,
    `Lectura del sabor: ${selectedFlavor.conclusion}`,
  ]);
  addPage("5. CONCLUSIONES", [
    "1. La expectativa influyo en el vocabulario de las personas participantes y en la seguridad con que explicaron su experiencia.",
    "2. El grupo control mantuvo una mayor coincidencia entre la etiqueta, la muestra y la descripcion expresada.",
    "3. El grupo experimental no perdio todas las senales del sabor real, pero las reorganizo usando la palabra sugerida.",
    "4. La percepcion gustativa debe entenderse como una experiencia donde participan sensacion, memoria, lenguaje y contexto.",
    "5. La recreacion orienta una hipotesis y no permite generalizar a toda la poblacion. Seria necesario ampliar la muestra y controlar otras variables.",
    "Conclusion integradora: la sugestion no inventa el estimulo, pero puede cambiar la historia que la persona cuenta sobre lo que acaba de probar.",
  ]);
  addPage("6. REFERENCIAS - APA 7", [
    "Goldstein, E. B. (2014). Sensation and perception (9th ed.). Cengage Learning.",
    "Spence, C. (2015). Multisensory flavor perception. Cell, 161(1), 24-35. https://doi.org/10.1016/j.cell.2015.03.007",
    "Shepherd, G. M. (2012). Neurogastronomy: How the brain creates flavor and why it matters. Columbia University Press.",
    "Nota de elaboracion: las referencias se incluyen como apoyo teorico; los datos de participantes y resultados son una recreacion ficticia elaborada para esta entrega.",
  ]);
  return buildPdfBinary(pages);
}

function legacyDownloadTastePdf(effect: number, selectedFlavor: FlavorStudy) {
  const pdf = makeTastePdf({ effect, selectedFlavor });
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `trabajo-campo-percepcion-gustativa-${selectedFlavor.id}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const legacyTabs: { id: Tab; label: string; short: string }[] = [
  { id: "overview", label: "Panorama", short: "01" },
  { id: "people", label: "Personas", short: "02" },
  { id: "results", label: "Resultados", short: "03" },
  { id: "method", label: "Método", short: "04" },
  { id: "conclusion", label: "Conclusión", short: "05" },
];

const legacyGroupLabel = (group: Group) => group === "all" ? "Todos" : group === "control" ? "Control" : "Experimental";
*/

export default function TastePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [group, setGroup] = useState<Group>("all");
  const [selectedId, setSelectedId] = useState("elena");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [flowStep, setFlowStep] = useState(3);
  const [selectedFlavorId, setSelectedFlavorId] = useState("limon");

  const visiblePeople = useMemo(
    () => participants.filter((person) => group === "all" || person.group === group),
    [group],
  );
  const selected = participants.find((person) => person.id === selectedId) ?? participants[4];
  const control = participants.filter((person) => person.group === "control");
  const experimental = participants.filter((person) => person.group === "experimental");
  const controlMatch = Math.round(control.reduce((sum, person) => sum + person.confidence, 0) / control.length);
  const experimentalMatch = Math.round(experimental.reduce((sum, person) => sum + person.confidence, 0) / experimental.length);
  const effect = controlMatch - experimentalMatch;
  const selectedFlavor = flavorStudies.find((flavor) => flavor.id === selectedFlavorId) ?? flavorStudies[0];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setFlowStep((step) => (step + 1) % flowSteps.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "people") setShowDetails(true);
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#18222d] selection:bg-[#ffc857] selection:text-[#18222d]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4 border-b border-[#d9d6ce] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#18222d] text-[#ffc857] shadow-[4px_4px_0_#ffc857]"><FlaskConical className="h-5 w-5" /></div>
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#6f777d]">BPSV-14 / Módulo 2</p><p className="text-sm font-bold">Laboratorio de percepción</p></div>
          </div>
          <div className="hidden items-center gap-3 sm:flex"><span className="rounded-full border border-[#b9e7d8] bg-[#e8f8f2] px-3 py-1.5 text-xs font-black text-[#187a60]"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#25b88b]" />Experimento documentado</span><span className="text-xs font-bold text-[#7d8385]">25 OCT 2026</span></div>
        </header>

        <section className="grid gap-8 pb-10 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div><p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#e36b4d]"><Sparkles className="h-4 w-4" /> Investigación de campo · datos de demostración</p><h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">¿Puede una etiqueta cambiar lo que <span className="text-[#e36b4d]">saboreamos?</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#697178] sm:text-lg">Un recorrido visual por un experimento sobre sugestión: la misma lógica de muestras, dos expectativas y ocho respuestas para observar cómo la mente completa la experiencia.</p></div>
          <div className="relative overflow-hidden rounded-[28px] bg-[#18222d] p-6 text-[#f8f5ef] shadow-[10px_10px_0_#ffc857] sm:p-8"><div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border-[18px] border-[#334452]" /><div className="relative"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffc857]">Pregunta guía</p><p className="mt-4 text-2xl font-black leading-tight">La expectativa llega al paladar antes que la muestra.</p><div className="mt-6 flex items-center gap-3 text-sm font-bold text-[#aab6bc]"><Waves className="h-5 w-5 text-[#ffc857]" /> Comparación control vs. sugerencia</div></div></div>
        </section>

        <nav className="mb-8 flex gap-2 overflow-x-auto border-y border-[#d9d6ce] py-3" aria-label="Secciones de la investigación">
          {tabs.map((tab) => <button key={tab.id} onClick={() => selectTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${activeTab === tab.id ? "bg-[#18222d] text-white shadow-[3px_3px_0_#ffc857]" : "text-[#70787d] hover:bg-white"}`}><span className={activeTab === tab.id ? "text-[#ffc857]" : "text-[#a3a7a6]"}>{tab.short}</span>{tab.label}</button>)}
        </nav>

        {activeTab === "overview" && <Overview controlMatch={controlMatch} experimentalMatch={experimentalMatch} effect={effect} isPlaying={isPlaying} setIsPlaying={setIsPlaying} onPeople={() => selectTab("people")} flowStep={flowStep} setFlowStep={setFlowStep} selectedFlavor={selectedFlavor} selectedFlavorId={selectedFlavorId} setSelectedFlavorId={setSelectedFlavorId} />}
        {activeTab === "people" && <People visiblePeople={visiblePeople} group={group} setGroup={setGroup} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} showDetails={showDetails} setShowDetails={setShowDetails} />}
        {activeTab === "results" && <Results controlMatch={controlMatch} experimentalMatch={experimentalMatch} effect={effect} selectedFlavor={selectedFlavor} selectedFlavorId={selectedFlavorId} setSelectedFlavorId={setSelectedFlavorId} />}
        {activeTab === "method" && <Method />}
        {activeTab === "conclusion" && <div><Conclusion effect={effect} /><PdfDownloadPanel effect={effect} selectedFlavor={selectedFlavor} /></div>}

        <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-[#d9d6ce] pt-5 text-xs text-[#7d8385] sm:flex-row"><p>Registro ilustrativo · participantes y respuestas inventados para completar la presentación visual.</p><p className="font-bold">APA 7 · lectura de apoyo incluida en la entrega</p></footer>
      </div>
    </main>
  );
}

function Overview({ controlMatch, experimentalMatch, effect, isPlaying, setIsPlaying, onPeople, flowStep, setFlowStep, selectedFlavor, selectedFlavorId, setSelectedFlavorId }: { controlMatch: number; experimentalMatch: number; effect: number; isPlaying: boolean; setIsPlaying: (value: boolean) => void; onPeople: () => void; flowStep: number; setFlowStep: (step: number) => void; selectedFlavor: FlavorStudy; selectedFlavorId: string; setSelectedFlavorId: (id: string) => void }) {
  return <div className="space-y-8">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Participantes" value="08" detail="4 control · 4 experimental" icon={<Users />} color="yellow" />
      <Metric label="Muestras servidas" value="04" detail="Limón · fresa · café · menta" icon={<Beaker />} color="coral" />
      <Metric label="Coincidencia control" value={`${controlMatch}%`} detail="Reconocieron la etiqueta real" icon={<Check />} color="green" />
      <Metric label="Efecto observado" value={`${effect} pp`} detail="Brecha de confianza promedio" icon={<Activity />} color="blue" />
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-[24px] border border-[#dedbd3] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a9194]">Lectura principal</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">La sugerencia movió la interpretación</h2></div><button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center gap-2 rounded-full bg-[#ffc857] px-4 py-2.5 text-sm font-black text-[#18222d] transition hover:-translate-y-0.5">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? "Pausar recorrido" : "Reproducir recorrido"}</button></div><div className="mt-8 space-y-6"><BarRow label="Control · etiqueta correcta" value={controlMatch} color="#25b88b" note="La percepción siguió la muestra" animated={isPlaying} /><BarRow label="Experimental · etiqueta sugerida" value={experimentalMatch} color="#e36b4d" note="La expectativa compitió con el sabor" animated={isPlaying} /></div><div className="mt-7 flex items-start gap-3 rounded-2xl bg-[#f8f5ef] p-4 text-sm leading-6 text-[#697178]"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#e36b4d]" /><p><strong className="text-[#18222d]">Hallazgo:</strong> el grupo experimental presentó una confianza media {effect} puntos porcentuales menor al describir la muestra, con cambios visibles en el vocabulario usado.</p></div></section>
      <section className="rounded-[24px] bg-[#e9f6f1] p-5 sm:p-7"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#328b72]">Recorrido activo</p><span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#328b72]">4 / 4</span></div><h2 className="mt-3 text-2xl font-black tracking-[-0.03em]">De la muestra a la respuesta</h2><div className="mt-7 space-y-5">{["Servir una muestra idéntica", "Introducir la etiqueta", "Registrar palabras espontáneas", "Comparar la confianza"].map((step, index) => <div key={step} className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25b88b] text-white"><Check className="h-4 w-4" /></div><p className="text-sm font-bold">{step}</p>{index < 3 && <ChevronRight className="ml-auto h-4 w-4 text-[#84c5b3]" />}</div>)}</div><button onClick={onPeople} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-[#a8daca] bg-white px-4 py-3 text-sm font-black text-[#287b65] hover:bg-[#f6fffb]">Ver respuestas individuales <ArrowRight className="h-4 w-4" /></button></section>
    </div>
    <InvestigationFlow flowStep={flowStep} setFlowStep={setFlowStep} isPlaying={isPlaying} setIsPlaying={setIsPlaying} selectedFlavor={selectedFlavor} selectedFlavorId={selectedFlavorId} setSelectedFlavorId={setSelectedFlavorId} />
    <section className="grid gap-5 md:grid-cols-3"><QuoteCard number="01" title="Expectativa" text="La etiqueta activa una hipótesis antes de probar." /><QuoteCard number="02" title="Sensación" text="El estímulo físico se mezcla con memoria y lenguaje." /><QuoteCard number="03" title="Percepción" text="La respuesta final es una construcción, no solo un dato." /></section>
  </div>;
}

function InvestigationFlow({ flowStep, setFlowStep, isPlaying, setIsPlaying, selectedFlavor, selectedFlavorId, setSelectedFlavorId }: { flowStep: number; setFlowStep: (step: number) => void; isPlaying: boolean; setIsPlaying: (value: boolean) => void; selectedFlavor: FlavorStudy; selectedFlavorId: string; setSelectedFlavorId: (id: string) => void }) {
  return <section className="overflow-hidden rounded-[28px] bg-[#18222d] p-5 text-white sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffc857]"><GitBranch className="h-4 w-4" /> Mapa vivo de decisiones</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Mira cómo cambia la respuesta en el tiempo</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#aab6bc]">Selecciona un sabor y recorre las cuatro decisiones del experimento. La simulación muestra qué palabra apareció primero y cómo terminó interpretándose.</p></div><button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center gap-2 rounded-full bg-[#ffc857] px-4 py-2.5 text-sm font-black text-[#18222d]">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? "Pausar flujo" : "Reproducir flujo"}</button></div><div className="mt-7 flex gap-2 overflow-x-auto pb-1">{flavorStudies.map((flavor) => <button key={flavor.id} onClick={() => setSelectedFlavorId(flavor.id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${selectedFlavorId === flavor.id ? "border-[#ffc857] bg-[#ffc857] text-[#18222d]" : "border-white/15 bg-white/5 text-[#c8d0d3] hover:bg-white/10"}`}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: flavor.color }} />{flavor.actual}</button>)}</div><div className="relative mt-10 grid gap-3 md:grid-cols-4">{flowSteps.map((step, index) => <button key={step.title} onClick={() => setFlowStep(index)} className={`relative z-10 rounded-2xl border p-4 text-left transition ${flowStep === index ? "border-[#ffc857] bg-white text-[#18222d] shadow-[0_0_0_3px_rgba(255,200,87,0.18)]" : "border-white/10 bg-white/5 text-[#c8d0d3]"}`}><div className="flex items-center justify-between"><span className={`text-xs font-black ${flowStep === index ? "text-[#d55d46]" : "text-[#ffc857]"}`}>0{index + 1}</span>{index <= flowStep && <Check className={`h-4 w-4 ${flowStep === index ? "text-[#d55d46]" : "text-[#25b88b]"}`} />}</div><h3 className="mt-6 font-black">{step.title}</h3><p className={`mt-1 text-xs leading-5 ${flowStep === index ? "text-[#697178]" : "text-[#aab6bc]"}`}>{step.label}</p></button>)}<div className="pointer-events-none absolute left-[10%] right-[10%] top-1/2 hidden h-px bg-white/15 md:block" /></div><div className="mt-5 grid gap-4 rounded-2xl bg-white/10 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-[#18222d]" style={{ backgroundColor: selectedFlavor.color }}>{selectedFlavor.actual.slice(0, 1)}</div><div><p className="text-xs font-black uppercase tracking-wider text-[#ffc857]">{flowSteps[flowStep].title} · {selectedFlavor.actual}</p><p className="mt-1 text-sm font-bold text-white">{flowStep === 0 ? `Se sirve una muestra con aroma ${selectedFlavor.aroma}.` : flowStep === 1 ? `Control recibe “${selectedFlavor.actual}”; experimental recibe “${selectedFlavor.suggested}”.` : flowStep === 2 ? `Control dice “${selectedFlavor.controlWords[0]}”; experimental dice “${selectedFlavor.experimentalWords[0]}”.` : selectedFlavor.conclusion}</p></div><div className="flex items-center gap-2 sm:justify-end"><button aria-label="Paso anterior" onClick={() => setFlowStep((flowStep + flowSteps.length - 1) % flowSteps.length)} className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-[#c8d0d3]">←</button><span className="text-xs font-black text-[#aab6bc]">{flowStep + 1} / {flowSteps.length}</span><button aria-label="Siguiente paso" onClick={() => setFlowStep((flowStep + 1) % flowSteps.length)} className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-[#c8d0d3]">→</button></div></div></section>;
}

function People({ visiblePeople, group, setGroup, selected, selectedId, setSelectedId, showDetails, setShowDetails }: { visiblePeople: Participant[]; group: Group; setGroup: (group: Group) => void; selected: Participant; selectedId: string; setSelectedId: (id: string) => void; showDetails: boolean; setShowDetails: (value: boolean) => void }) {
  return <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]"><section className="rounded-[24px] border border-[#dedbd3] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a9194]">Muestra de participantes</p><h2 className="mt-2 text-2xl font-black">¿Quién probó qué?</h2></div><div className="flex gap-1 rounded-full bg-[#f3f1eb] p-1">{(["all", "control", "experimental"] as Group[]).map((value) => <button key={value} onClick={() => setGroup(value)} className={`rounded-full px-3 py-2 text-xs font-black ${group === value ? "bg-[#18222d] text-white" : "text-[#7d8385]"}`}>{groupLabel(value)}</button>)}</div></div><div className="mt-6 space-y-2">{visiblePeople.map((person) => <button key={person.id} onClick={() => { setSelectedId(person.id); setShowDetails(true); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${selectedId === person.id ? "border-[#ffc857] bg-[#fff9e8] shadow-[3px_3px_0_#ffc857]" : "border-[#ebe8e0] bg-[#fcfbf8]"}`}><div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-[#18222d]" style={{ backgroundColor: person.color }}>{person.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="font-black">{person.name}</p><span className={`text-[10px] font-black uppercase tracking-wider ${person.group === "control" ? "text-[#1d9775]" : "text-[#d55d46]"}`}>{groupLabel(person.group)}</span></div><p className="mt-1 text-xs text-[#7d8385]">{person.sample} · probó una muestra de {person.actual.toLowerCase()}</p></div><ChevronRight className="h-4 w-4 text-[#aeb4b5]" /></button>)}</div></section><section className={`rounded-[24px] bg-[#18222d] p-5 text-white transition sm:p-7 ${showDetails ? "" : "opacity-75"}`}><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffc857]">Ficha de respuesta</p><h2 className="mt-2 text-3xl font-black">{selected.name}</h2></div><div className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-[#18222d]" style={{ backgroundColor: selected.color }}>{selected.name.slice(0, 1)}</div></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Edad", `${selected.age}`], ["Grupo", groupLabel(selected.group)], ["Muestra", selected.sample], ["Confianza", `${selected.confidence}%`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-[#aab6bc]">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>)}</div><DecisionTrail selected={selected} /><div className="mt-7 rounded-2xl border border-white/10 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#aab6bc]">Etiqueta administrada</p><div className="mt-2 flex items-center gap-3 text-lg font-black"><span className="rounded-lg bg-[#ffc857] px-3 py-1 text-[#18222d]">{selected.label}</span><ArrowRight className="h-4 w-4 text-[#ffc857]" /><span className="text-[#aab6bc]">sabor real: {selected.actual}</span></div></div><div className="mt-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#aab6bc]">Descripción registrada</p><p className="mt-2 text-2xl font-black text-[#ffc857]">“{selected.perceived}”</p><p className="mt-2 text-sm leading-6 text-[#c8d0d3]">{selected.note}</p></div><button onClick={() => setShowDetails(!showDetails)} className="mt-7 flex items-center gap-2 text-sm font-black text-[#ffc857]">{showDetails ? "Ocultar ficha" : "Mostrar ficha"} <Eye className="h-4 w-4" /></button></section></div>;
}

function DecisionTrail({ selected }: { selected: Participant }) {
  const decision = selected.group === "control" ? ["Ve la etiqueta real", `Prueba ${selected.actual.toLowerCase()}`, `Dice “${selected.perceived}”`, `Sostiene la respuesta (${selected.confidence}%)`] : ["Ve una etiqueta alternativa", `Prueba ${selected.actual.toLowerCase()}`, `Busca señales de “${selected.label.toLowerCase()}”`, `Ajusta la respuesta (${selected.confidence}%)`];
  return <div className="mt-7"><div className="mb-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#ffc857]" /><p className="text-xs font-black uppercase tracking-[0.14em] text-[#aab6bc]">Decisión en el tiempo</p></div><div className="grid gap-2 sm:grid-cols-4">{decision.map((step, index) => <div key={step} className="relative rounded-xl bg-white/10 p-3"><p className="text-[10px] font-black text-[#ffc857]">0{index + 1}</p><p className="mt-2 text-xs font-bold leading-5 text-[#e5eaeb]">{step}</p>{index < decision.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-[#ffc857] sm:block" />}</div>)}</div></div>;
}

function Results({ controlMatch, experimentalMatch, effect, selectedFlavor, selectedFlavorId, setSelectedFlavorId }: { controlMatch: number; experimentalMatch: number; effect: number; selectedFlavor: FlavorStudy; selectedFlavorId: string; setSelectedFlavorId: (id: string) => void }) {
  return <div className="space-y-5"><section className="rounded-[24px] border border-[#dedbd3] bg-white p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a9194]">Registro de resultados</p><h2 className="mt-2 text-3xl font-black">La palabra también saborea</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#697178]">Las puntuaciones representan la seguridad con la que cada persona sostuvo su primera descripción. Son datos simulados para mostrar cómo quedaría el análisis.</p></div><div className="rounded-2xl bg-[#fff4d0] px-5 py-4 text-center"><p className="text-xs font-black uppercase text-[#99731c]">Diferencia</p><p className="text-4xl font-black text-[#18222d]">{effect}<span className="text-xl"> pp</span></p></div></div><div className="mt-9 grid gap-8 md:grid-cols-2"><ResultColumn title="Grupo control" subtitle="Etiqueta correcta" value={controlMatch} color="#25b88b" rows={participants.filter((p) => p.group === "control")} /><ResultColumn title="Grupo experimental" subtitle="Etiqueta sugestiva" value={experimentalMatch} color="#e36b4d" rows={participants.filter((p) => p.group === "experimental")} /></div></section><section className="rounded-[24px] bg-[#f1eee7] p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a9194]">Comparador de sabores</p><h2 className="mt-2 text-2xl font-black">Una muestra, dos historias</h2></div><p className="text-sm font-bold text-[#7d8385]">Selecciona un sabor para cambiar la lectura</p></div><div className="mt-5 grid gap-3 sm:grid-cols-4">{flavorStudies.map((flavor) => <button key={flavor.id} onClick={() => setSelectedFlavorId(flavor.id)} className={`rounded-2xl border p-4 text-left transition ${selectedFlavorId === flavor.id ? "border-[#18222d] bg-white shadow-[4px_4px_0_#ffc857]" : "border-[#ddd9cf] bg-[#faf9f6] hover:bg-white"}`}><span className="mb-3 block h-3 w-3 rounded-full" style={{ backgroundColor: flavor.color }} /><p className="font-black">{flavor.actual}</p><p className="mt-1 text-xs text-[#7d8385]">vs. {flavor.suggested}</p></button>)}</div><div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-2xl bg-[#18222d] p-5 text-white"><p className="text-xs font-black uppercase tracking-wider text-[#ffc857]">{selectedFlavor.actual} · lectura comparada</p><div className="mt-6 space-y-4"><div><div className="mb-2 flex justify-between text-xs font-black"><span>Control</span><span className="text-[#79e0be]">{selectedFlavor.controlWords.join(" · ")}</span></div><div className="h-3 rounded-full bg-white/10"><div className="h-full w-[88%] rounded-full bg-[#25b88b]" /></div></div><div><div className="mb-2 flex justify-between text-xs font-black"><span>Experimental</span><span className="text-[#ff9e87]">{selectedFlavor.experimentalWords.join(" · ")}</span></div><div className="h-3 rounded-full bg-white/10"><div className="h-full w-[66%] rounded-full bg-[#e36b4d]" /></div></div></div></div><div className="flex flex-col justify-center rounded-2xl bg-white p-5"><div className="flex items-center gap-3"><span className="rounded-lg px-3 py-2 text-sm font-black text-[#18222d]" style={{ backgroundColor: selectedFlavor.color }}>{selectedFlavor.actual}</span><ArrowRight className="h-4 w-4 text-[#aeb4b5]" /><span className="rounded-lg bg-[#fff0ec] px-3 py-2 text-sm font-black text-[#d55d46]">{selectedFlavor.suggested}</span></div><p className="mt-5 text-lg font-black leading-7">{selectedFlavor.conclusion}</p><p className="mt-3 text-sm leading-6 text-[#697178]">La comparación no elimina la sensación física; muestra cómo la decisión final toma forma con las palabras disponibles.</p></div></div></section><section className="grid gap-5 md:grid-cols-3"><StatCallout icon={<CircleHelp />} title="Patrón" text="Las personas del control usaron más descriptores sensoriales directos." /><StatCallout icon={<Waves />} title="Tensión" text="El grupo experimental mezcló sabor real con la palabra sugerida." /><StatCallout icon={<Lightbulb />} title="Cuidado" text="Una muestra pequeña orienta una hipótesis, no una verdad universal." /></section></div>;
}

function Method() { return <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]"><section className="rounded-[24px] border border-[#dedbd3] bg-white p-5 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a9194]">Desarrollo del experimento</p><h2 className="mt-2 text-3xl font-black">Diseño en cuatro movimientos</h2><div className="mt-8 space-y-4">{[["01", "Preparar", "Se eligieron cuatro alimentos de perfiles reconocibles: limón, fresa, café y menta."], ["02", "Dividir", "Se formaron dos grupos de cuatro personas, procurando mantener el mismo número de muestras."], ["03", "Sugerir", "Control recibió el nombre real; experimental recibió un nombre alternativo antes de probar."], ["04", "Registrar", "Cada participante dijo la primera sensación y calificó su seguridad de 0 a 100." ]].map(([number, title, text]) => <div key={number} className="flex gap-4 rounded-2xl bg-[#f8f5ef] p-4"><span className="text-sm font-black text-[#e36b4d]">{number}</span><div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-[#697178]">{text}</p></div></div>)}</div></section><section className="rounded-[24px] bg-[#ffc857] p-5 sm:p-8"><Beaker className="h-8 w-8 text-[#18222d]" /><h2 className="mt-8 text-3xl font-black leading-tight">Variables bajo observación</h2><div className="mt-7 space-y-4">{[["Independiente", "Nombre presentado antes de la muestra"], ["Dependiente", "Sabor descrito y nivel de confianza"], ["Control", "Muestra y cantidad servida"], ["Ética", "Participación voluntaria y sin datos sensibles"]].map(([label, value]) => <div key={label} className="border-t border-[#d4a82f] pt-3"><p className="text-xs font-black uppercase tracking-wider text-[#806317]">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>)}</div></section></div>; }

function Conclusion({ effect }: { effect: number }) { return <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"><section className="rounded-[24px] bg-[#18222d] p-6 text-white sm:p-9"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffc857]">Cierre de la investigación</p><h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">La sugestión no inventa el estímulo, pero sí puede cambiar su historia.</h2><p className="mt-6 max-w-2xl text-base leading-7 text-[#c8d0d3]">En esta simulación, el grupo con etiquetas correctas describió sus muestras con mayor seguridad. El grupo experimental conservó algunas señales físicas, aunque las reinterpretó mediante el nombre sugerido.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{["La expectativa orientó el vocabulario.", "La sensación y la interpretación no son idénticas.", "El diseño permitió comparar dos condiciones.", "Una muestra mayor ayudaría a confirmar el patrón.", "El registro inmediato redujo el recuerdo reconstruido."].map((text) => <div key={text} className="flex gap-2 rounded-xl bg-white/10 p-3 text-sm font-bold"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ffc857]" />{text}</div>)}</div></section><section className="rounded-[24px] border border-[#dedbd3] bg-white p-6 sm:p-9"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-[#e36b4d]" /><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a9194]">Conclusión breve</p></div><p className="mt-7 text-xl font-black leading-8">El efecto observado fue de <span className="text-[#e36b4d]">{effect} puntos porcentuales</span> entre grupos. El resultado respalda la idea de que la percepción gustativa combina estímulo, expectativa y lenguaje.</p><div className="mt-8 rounded-2xl bg-[#e9f6f1] p-5"><p className="text-sm font-black text-[#287b65]">Referencias de apoyo · APA 7</p><p className="mt-3 text-sm leading-6 text-[#49685e]">Goldstein, E. B. (2014). <i>Sensation and perception</i> (9th ed.). Cengage Learning.</p><p className="mt-2 text-sm leading-6 text-[#49685e]">Spence, C. (2015). Multisensory flavor perception. <i>Cell, 161</i>(1), 24–35.</p></div></section></div>; }

function Metric({ label, value, detail, icon, color }: { label: string; value: string; detail: string; icon: React.ReactNode; color: string }) { const colors: Record<string, string> = { yellow: "bg-[#fff4d0] text-[#9b7417]", coral: "bg-[#fff0ec] text-[#d55d46]", green: "bg-[#e9f6f1] text-[#25846b]", blue: "bg-[#edf3fa] text-[#4d7294]" }; return <section className="rounded-[20px] border border-[#dedbd3] bg-white p-4"><div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</div><p className="text-xs font-black uppercase tracking-wider text-[#8a9194]">{label}</p><p className="mt-1 text-3xl font-black tracking-[-0.05em]">{value}</p><p className="mt-1 text-xs leading-5 text-[#7d8385]">{detail}</p></section>; }

function BarRow({ label, value, color, note, animated }: { label: string; value: number; color: string; note: string; animated: boolean }) { return <div><div className="mb-2 flex justify-between gap-3 text-sm font-black"><span>{label}</span><span>{value}%</span></div><div className="h-4 overflow-hidden rounded-full bg-[#f0eee8]"><div className={`h-full rounded-full transition-all duration-700 ${animated ? "animate-pulse" : ""}`} style={{ width: `${value}%`, backgroundColor: color }} /></div><p className="mt-2 text-xs text-[#7d8385]">{note}</p></div>; }

function QuoteCard({ number, title, text }: { number: string; title: string; text: string }) { return <div className="rounded-[20px] border border-[#dedbd3] bg-white p-5"><p className="text-sm font-black text-[#e36b4d]">{number}</p><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#697178]">{text}</p></div>; }
function ResultColumn({ title, subtitle, value, color, rows }: { title: string; subtitle: string; value: number; color: string; rows: Participant[] }) { return <div><div className="flex items-end justify-between gap-3"><div><h3 className="text-lg font-black">{title}</h3><p className="text-sm text-[#7d8385]">{subtitle}</p></div><p className="text-3xl font-black" style={{ color }}>{value}%</p></div><div className="mt-4 h-3 rounded-full bg-[#f0eee8]"><div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} /></div><div className="mt-5 space-y-3">{rows.map((row) => <div key={row.id} className="flex items-center gap-3 text-sm"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} /><span className="w-20 font-bold">{row.name}</span><div className="h-2 flex-1 rounded-full bg-[#f0eee8]"><div className="h-full rounded-full" style={{ width: `${row.confidence}%`, backgroundColor: color }} /></div><span className="w-9 text-right font-black">{row.confidence}</span></div>)}</div></div>; }
function StatCallout({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-[20px] border border-[#dedbd3] bg-[#f8f5ef] p-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#e36b4d]">{icon}</div><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#697178]">{text}</p></div>; }

function PdfDownloadPanel({ effect, selectedFlavor }: { effect: number; selectedFlavor: FlavorStudy }) {
  return <section className="mt-5 rounded-[24px] border-2 border-dashed border-[#e0b43f] bg-[#fff9e8] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b7417]">Entrega final</p><h2 className="mt-2 text-2xl font-black text-[#18222d]">Descargar trabajo completo en PDF</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#697178]">Genera el documento con el estado actual de la investigación: portada, introducción, método, participantes, resultados, conclusiones y referencias APA 7.</p></div><button type="button" onClick={() => downloadTastePdf(effect, selectedFlavor)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#18222d] px-5 py-3.5 text-sm font-black text-white shadow-[4px_4px_0_#ffc857] transition hover:-translate-y-0.5 hover:bg-[#273746]"><Download className="h-5 w-5 text-[#ffc857]" /> Descargar PDF</button></div><p className="mt-4 text-xs font-bold text-[#9b7417]">Se descargará la versión visible al momento de pulsar el botón. Sabor comparado: {selectedFlavor.actual} vs. {selectedFlavor.suggested}.</p></section>;
}
