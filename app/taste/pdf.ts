import { participants, groupLabel } from "./data";
import type { FlavorStudy } from "./types";

function pdfSafeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
    } else current = `${current} ${word}`.trim();
  });
  if (current) lines.push(current);
  return lines;
}

function buildPdfBinary(pages: string[][]) {
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
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
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Array.from(pdf, (character) => character.charCodeAt(0)));
}

export function downloadTastePdf(effect: number, selectedFlavor: FlavorStudy) {
  const pages: string[][] = [];
  const addPage = (title: string, sections: string[]) => pages.push(["BPSV-14 - ATENCION, SENSACION Y PERCEPCION", "", title, "", ...sections.flatMap((section) => [...wrapPdfText(section), ""])].slice(0, 44));
  addPage("EFECTO DE LA SUGESTION EN LA PERCEPCION GUSTATIVA", ["Trabajo de campo - Modulo 2", "", "Estudiante: ______________________________", "Curso: BPSV-14", "Fecha: 25 de octubre de 2026", "", "Documento generado desde el Laboratorio de percepcion gustativa.", "", "Nota: los participantes, respuestas y resultados de esta recreacion son datos ficticios de demostracion para completar la presentacion visual."]);
  addPage("1. INTRODUCCION", ["La percepcion gustativa no depende unicamente de las sustancias que entran en contacto con la lengua. Antes y durante la prueba, la persona interpreta senales visuales, palabras, recuerdos y expectativas. Por eso, una etiqueta puede orientar la forma en que se describe un sabor, incluso cuando la muestra fisica permanece igual.", "Este trabajo presenta una recreacion de un experimento de campo sobre el efecto de la sugestion en la percepcion gustativa. Se comparo un grupo control, que recibio etiquetas correctas, con un grupo experimental, que recibio nombres alternativos para las mismas familias de muestras.", "La pregunta guia fue: puede una palabra presentada antes de probar modificar la descripcion y la confianza con que una persona sostiene su respuesta? El recorrido visual registra el proceso desde la muestra hasta la conclusion."]);
  addPage("2. OBJETIVOS Y METODO", ["Objetivo general: identificar como la sugestion puede influir en la percepcion y en el lenguaje utilizado para describir un sabor.", "Objetivos especificos: comparar dos grupos; registrar la primera respuesta; observar el nivel de confianza; y analizar semejanzas y diferencias entre sabores.", "Participaron ocho personas ficticias, organizadas en dos grupos de cuatro. Se trabajaron cuatro muestras: limon, fresa, cafe y menta. El grupo control vio el nombre real. El grupo experimental vio, respectivamente, manzana verde, sandia, chocolate y albahaca.", "Cada persona recibio una cantidad equivalente, dijo su primera impresion y asigno una confianza de 0 a 100. La observacion se organizo en cuatro momentos: preparar, nombrar, probar y decidir."]);
  addPage("3. REGISTRO DE PARTICIPANTES", participants.map((person) => `${person.name} | ${groupLabel(person.group)} | ${person.sample} | Real: ${person.actual} | Etiqueta: ${person.label} | Primera respuesta: ${person.perceived} | Confianza: ${person.confidence}%`));
  addPage("4. RESULTADOS Y COMPARACION", [`Promedio de confianza del grupo control: ${Math.round(participants.filter((person) => person.group === "control").reduce((sum, person) => sum + person.confidence, 0) / 4)}%.`, `Promedio de confianza del grupo experimental: ${Math.round(participants.filter((person) => person.group === "experimental").reduce((sum, person) => sum + person.confidence, 0) / 4)}%.`, `Brecha observada entre grupos: ${effect} puntos porcentuales.`, `Sabor seleccionado en la pagina al descargar: ${selectedFlavor.actual}.`, `Comparacion activa: sabor real ${selectedFlavor.actual} frente a etiqueta sugestiva ${selectedFlavor.suggested}.`, `Palabras del control: ${selectedFlavor.controlWords.join(", ")}.`, `Palabras del grupo experimental: ${selectedFlavor.experimentalWords.join(", ")}.`, `Lectura del sabor: ${selectedFlavor.conclusion}`]);
  addPage("5. CONCLUSIONES", ["1. La expectativa influyo en el vocabulario de las personas participantes y en la seguridad con que explicaron su experiencia.", "2. El grupo control mantuvo una mayor coincidencia entre la etiqueta, la muestra y la descripcion expresada.", "3. El grupo experimental no perdio todas las senales del sabor real, pero las reorganizo usando la palabra sugerida.", "4. La percepcion gustativa debe entenderse como una experiencia donde participan sensacion, memoria, lenguaje y contexto.", "5. La recreacion orienta una hipotesis y no permite generalizar a toda la poblacion. Seria necesario ampliar la muestra y controlar otras variables.", "Conclusion integradora: la sugestion no inventa el estimulo, pero puede cambiar la historia que la persona cuenta sobre lo que acaba de probar."]);
  addPage("6. REFERENCIAS - APA 7", ["Goldstein, E. B. (2014). Sensation and perception (9th ed.). Cengage Learning.", "Spence, C. (2015). Multisensory flavor perception. Cell, 161(1), 24-35. https://doi.org/10.1016/j.cell.2015.03.007", "Shepherd, G. M. (2012). Neurogastronomy: How the brain creates flavor and why it matters. Columbia University Press.", "Nota de elaboracion: las referencias se incluyen como apoyo teorico; los datos de participantes y resultados son una recreacion ficticia elaborada para esta entrega."]);
  const url = URL.createObjectURL(new Blob([buildPdfBinary(pages)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `trabajo-campo-percepcion-gustativa-${selectedFlavor.id}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
