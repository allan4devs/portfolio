import { jsPDF } from "jspdf";
import { groupLabel } from "./navigation";
import { flavorStudies } from "./flavorStudies";
import { participants } from "./participantResponses";
import type { FlavorStudy } from "./types";
type ReportPage = { title: string; lines: string[]; cover?: boolean; visual?: "flavors" | "results"; chart?: { control: number; experimental: number } };
const wrapText = (text: string, _width?: number) => [text];
function splitReportPages(title: string, paragraphs: string[], visual?: ReportPage["visual"], chart?: ReportPage["chart"]): ReportPage[] { return [{title, lines: paragraphs, visual, chart}]; }
function makeReportPages(effect: number, selectedFlavor: FlavorStudy) {
  const control = participants.filter((person) => person.group === "control");
  const experimental = participants.filter((person) => person.group === "experimental");
  const average = (people: typeof participants) => Math.round(people.reduce((sum, person) => sum + person.confidence, 0) / people.length);
  const pages: ReportPage[] = [{ title: "TRABAJO DE CAMPO  /  MODULO 2", cover: true, lines: wrapText("Una mirada breve a lo que ocurre cuando una palabra llega antes que el sabor.", 76).concat(["", "Estudiante: ______________________________", "Curso: BPSV-14", "Fecha: 25 de octubre de 2026", "", "Documento generado desde el Laboratorio de percepcion gustativa.", "", "Aviso: participantes, respuestas y resultados son datos ficticios de demostracion."]) }];
  pages.push(...splitReportPages("1. INTRODUCCIÓN", ["La percepción gustativa permite estudiar cómo una experiencia cotidiana reúne información sensorial y conocimientos previos. Al probar una bebida, la persona no registra únicamente sus propiedades químicas: también reconoce aromas, temperatura y sensaciones en la boca, y busca palabras para describir lo que encuentra. Por ello, identificar un alimento no equivale a recibir pasivamente un estímulo. En este trabajo se diferencia la sensación, entendida como recepción de información, de la percepción, que implica organizarla e interpretarla (Goldstein, 2014).", "Desde una perspectiva multisensorial, el sabor integra señales que proceden de distintos sistemas. La experiencia de una fruta incluye componentes gustativos y olfativos, además de textura y temperatura. Shepherd (2012) ofrece un marco para comprender la participación del cerebro en esa integración. Esta distinción ayuda a interpretar expresiones como fresco, herbal o acuoso: no todas describen un gusto básico, aunque formen parte de la experiencia que las personas comunican al degustar.", "El contexto verbal también merece atención. Conocer el nombre supuesto de una muestra puede orientar la búsqueda de características y ofrecer una categoría con la cual describir una sensación ambigua. La revisión de Spence (2015b) aborda la naturaleza multisensorial del sabor y permite situar esta pregunta dentro de un marco más amplio. En consecuencia, conviene observar tanto los términos empleados como las dudas y la confianza, sin asumir que una respuesta segura representa necesariamente una identificación correcta.", "La pregunta que guía esta recreación es la siguiente: ¿cómo varían las descripciones y la confianza cuando el nombre anunciado coincide o no con la muestra? Para ilustrarla se comparan ocho participantes ficticios distribuidos en un grupo control y otro experimental. El primero recibe etiquetas coincidentes; el segundo, etiquetas de otros sabores. El conjunto de muestras incluye kiwi, menta, sandía, fresa y limón, por lo que no corresponde describir todos los estímulos como cítricos.", "El propósito es relacionar conceptos de sensación, percepción y expectativa mediante un registro comprensible. El informe presenta las muestras, los objetivos, el procedimiento propuesto, las respuestas individuales y una comparación descriptiva. Asimismo, distingue confianza de exactitud y reconoce que las contribuciones sensoriales no deben expresarse mediante porcentajes universales sin respaldo suficiente, tal como advierte Spence (2015a) al examinar afirmaciones sobre el olfato.", "Los datos son simulados y tienen una finalidad didáctica: no documentan una aplicación real ni prueban un efecto causal. Las diferencias entre grupos sirven para formular preguntas y examinar interpretaciones alternativas. Mantener explícita esta condición evita confundir una ilustración con evidencia empírica. La lectura del trabajo debe valorar, por tanto, la coherencia entre el planteamiento, los registros y sus límites, antes que convertir los promedios de la demostración en conclusiones generales sobre la población."]));
  pages.push({ title: "2. LAS MUESTRAS", visual: "flavors", lines: wrapText("El experimento reúne cinco sabores reconocibles. La tarjeta muestra el sabor servido y la etiqueta que recibió el grupo experimental.") });
  pages.push(...splitReportPages("3. OBJETIVOS Y MÉTODO", [
    "Objetivo general: explorar si una etiqueta previa influye en las palabras y en la confianza usadas para describir un sabor.",
    "Objetivos específicos: comparar dos grupos, registrar la primera respuesta, observar la confianza y revisar en qué momentos aparecen dudas o cambios de vocabulario.",
    "Se trabajaron cinco rondas con kiwi, menta, sandía, fresa y limón, servidos en agua fría sin azúcar. Se mantuvieron constantes la cantidad, el volumen y la temperatura.",
    "Cada persona dijo lo primero que notó y asignó una confianza de 0 a 100. La actividad se ordeno en cuatro momentos: preparar, presentar, probar y registrar.",
    "Esta es una recreación didactica. La muestra es pequeña, no hay aleatorización formal y los resultados no deben generalizarse a toda la poblacion.",
  ]));
  pages.push(...splitReportPages("4. REGISTRO DE PARTICIPANTES", participants.map((person) => `${person.name} (${person.age} años) - ${groupLabel(person.group)} - ${person.sample}. Muestra real: ${person.actual}. Etiqueta: ${person.label}. Primera respuesta: ${person.perceived} Confianza: ${person.confidence}%. Nota: ${person.note}`)));
  pages.push(...splitReportPages("5. RESULTADOS Y COMPARACIÓN", [
    `Confianza promedio del grupo control: ${average(control)}%.`, `Confianza promedio del grupo experimental: ${average(experimental)}%.`,
    `Brecha observada: ${effect} puntos porcentuales. Esta diferencia se interpreta como una señal descriptiva dentro de esta recreación, no como una prueba estadística.`,
    `Ronda seleccionada en la pagina: ${selectedFlavor.actual} frente a la etiqueta ${selectedFlavor.suggested}.`,
    `En el control aparecieron palabras como ${selectedFlavor.controlWords.join(", ")}. En el grupo experimental aparecieron ${selectedFlavor.experimentalWords.join(", ")}.`, selectedFlavor.conclusion,
    "La lectura más prudente es que la etiqueta no reemplazó por completo la sensación. En varios casos convivieron pistas del sabor real con la palabra que estaba disponible antes de probar.",
  ], "results", { control: average(control), experimental: average(experimental) }));
  pages.push(...splitReportPages("6. DISCUSIÓN Y LIMITACIONES", [
    "El patrón observado tiene una explicación posible: cuando dos sabores son cercanos, la etiqueta ofrece una forma rápida de ordenar una experiencia ambigua. Esa palabra puede aparecer en la respuesta sin borrar las demás sensaciones.",
    "También hay explicaciones alternativas. La concentración, la temperatura, el orden de las rondas, la edad y la familiaridad con cada sabor pudieron influir. Una prueba posterior debería controlar mejor estos factores y aumentar el número de participantes.",
    "La confianza tampoco equivale a exactitud. Una persona puede estar muy segura y equivocarse, o dudar y aun así mencionar una pista sensorial importante.",
  ]));
  pages.push(...splitReportPages("7. CONCLUSIONES", ["1. La recreación permite examinar cómo una etiqueta previa puede orientar las palabras elegidas para describir una muestra. En los registros simulados aparecen expresiones compatibles con el nombre sugerido, junto con características del estímulo presentado. Este patrón ilustra una hipótesis sobre la influencia de la expectativa, pero no constituye una demostración experimental. El objetivo de explorar esa relación se aborda mediante una comparación descriptiva y una lectura cuidadosa de las respuestas.", "2. El grupo control presenta una mayor concordancia descriptiva entre el nombre anunciado y la muestra. Sin embargo, recibir la etiqueta coincidente también facilita disponer de una respuesta verbal. Por esta razón, esa concordancia no puede atribuirse únicamente a una mayor capacidad sensorial. Una investigación posterior tendría que distinguir el reconocimiento espontáneo de la repetición del nombre proporcionado y definir de antemano cómo se evaluará la identificación.", "3. En el grupo experimental se conservan señales que no coinciden por completo con la etiqueta. La acidez, el frescor y la sensación acuosa ofrecen puntos de comparación para reconocer esa tensión. Esto permite representar la percepción como una interpretación que combina distintas pistas, en lugar de asumir que la sugerencia borra necesariamente la información sensorial. El marco multisensorial de Spence (2015b) resulta útil para organizar esta lectura sin convertirlo en prueba de los datos simulados.", "4. La diferencia de confianza entre los grupos debe interpretarse con prudencia. La escala empleada registra seguridad declarada, no precisión objetiva ni intensidad del sabor. Tampoco permite calcular por sí sola el tamaño de un efecto causal o su significación estadística. El contraste observado pertenece exclusivamente al conjunto de respuestas de demostración. Con ocho perfiles y estímulos distintos entre algunos registros, no existe una base suficiente para generalizar a otras personas o situaciones.", "5. El ejercicio muestra la importancia de mejorar el procedimiento antes de realizar un estudio real. Sería necesario equilibrar las muestras entre grupos, variar el orden de presentación, controlar cantidades y temperatura y registrar las respuestas con criterios comunes. También habría que contemplar familiaridad, edad y posibles restricciones alimentarias; si participan menores, correspondería establecer las autorizaciones pertinentes. Estas medidas reducirían explicaciones alternativas y permitirían comparar con mayor claridad la información sensorial y la expectativa verbal.", "Como conclusión integradora, el trabajo relaciona sensación, lenguaje y contexto de una manera accesible, manteniendo separados el apoyo teórico y la simulación. La bibliografía ayuda a comprender por qué el sabor es una experiencia compleja, mientras los registros ilustran preguntas que podrían investigarse. El aprendizaje principal consiste en observar cómo se construye una descripción y reconocer hasta dónde llega la evidencia disponible. Solo una aplicación real, documentada y metodológicamente controlada permitiría evaluar la hipótesis planteada y sostener conclusiones empíricas."]));
  pages.push(...splitReportPages("8. REFERENCIAS Y NOTA DE ELABORACIÓN", [
    "Goldstein, E. B. (2014). Sensation and perception (9th ed.). Cengage Learning.", "Spence, C. (2015b). Multisensory flavor perception. Cell, 161(1), 24-35. https://doi.org/10.1016/j.cell.2015.03.007", "Spence, C. (2015a). Just how much of what we taste derives from the sense of smell? Flavour, 4, Article 30. https://doi.org/10.1186/s13411-015-0040-2", "Shepherd, G. M. (2012). Neurogastronomy: How the brain creates flavor and why it matters. Columbia University Press.", "Las referencias sirven como apoyo teorico. Los participantes, las frases y los promedios de este documento fueron elaborados como una recreación para la entrega visual.",
  ]));
  return pages;
}


/** Arial must be supplied as licensed font bytes; no silent substitute is used. */
export function makeTastePdf(effect: number, selectedFlavor: FlavorStudy, fonts: {normal: string; bold: string; italic: string}) {
  const doc = new jsPDF({unit: "pt", format: "letter"});
  for (const [style, data] of Object.entries(fonts)) {
    const name = `Arial-${style}.ttf`;
    doc.addFileToVFS(name, data);
    doc.addFont(name, "Arial", style);
  }
  const left = 72, width = 468, bottom = 720, step = 16.5;
  let y = 72;
  const paragraph = (text: string, reference = false) => {
    doc.setFont("Arial", "normal"); doc.setFontSize(11);
    if (reference) {
      const italicTitles = ["Sensation and perception", "Neurogastronomy: How the brain creates flavor and why it matters", "Flavour, 4", "Cell, 161"];
      const title = italicTitles.find(t => text.includes(t));
      let x = left;
      let position = 0;
      for (const word of text.split(" ")) {
        const italic = title && position >= text.indexOf(title) && position < text.indexOf(title) + title.length;
        doc.setFont("Arial", italic ? "italic" : "normal");
        const wordWidth = doc.getTextWidth(word + " ");
        if (x + wordWidth > left + width) { x = left + 36; y += step; }
        if (y > bottom) { doc.addPage(); y = 72; }
        doc.text(word, x, y); x += wordWidth; position += word.length + 1;
      }
      y += step * 2;
      return;
    }
    const lines: string[] = doc.splitTextToSize(text, width - (reference ? 36 : 18));
    lines.forEach((line, i) => {
      if (y > bottom) { doc.addPage(); y = 72; }
      doc.text(line, left + (reference ? (i ? 36 : 0) : (i ? 0 : 18)), y);
      y += step;
    });
    y += 0;
  };
  const sections = makeReportPages(effect, selectedFlavor);
  sections.forEach((section, index) => {
    if (index) doc.addPage();
    y = 72; doc.setFont("Arial", "bold"); doc.setFontSize(11);
    if (section.cover) {
      ["San Marcos", "Bachillerato en Psicología", "Atención, Sensación y Percepción", "Efecto de la sugestión en la percepción gustativa", "Verónica Fiorella Vindas Campos", "Profesor: Ing. Minor Emanuel Hernández Espinoza", "25 de octubre de 2026", "Recreación didáctica con datos ficticios"].forEach((line, i) => doc.text(line, 306, 130 + i * 65, {align: "center"}));
      return;
    }
    doc.text(section.title, left, y); y += 27;
    let paragraphs = section.lines;
    if (section.title.startsWith("8.")) {
      const refs = paragraphs.filter(p => !p.startsWith("Las referencias"));
      paragraphs = refs.sort((a,b) => a.localeCompare(b));
    }
    paragraphs.forEach(p => paragraph(p, section.title.startsWith("8.")));
    if (section.visual === "flavors") {
      flavorStudies.forEach(f => paragraph(`${f.actual}. Etiqueta experimental: ${f.suggested}. Aroma: ${f.aroma}.`));
    }
    if (section.visual === "results" && section.chart) {
      if (y + 100 > bottom) { doc.addPage(); y = 72; }
      for (const [label, value] of [["Control", section.chart.control], ["Experimental", section.chart.experimental]] as const) {
        doc.text(`${label}: ${value}%`, left, y + 12);
        doc.setFillColor(80, 110, 130); doc.rect(left + 115, y, value * 2.5, 15, "F"); y += 33;
      }
    }
  });
  const count = doc.getNumberOfPages();
  for (let p = 1; p <= count; p++) {
    doc.setPage(p); doc.setFont("Arial", "normal"); doc.setFontSize(11);
    doc.text(String(p), 540, 40, {align: "right"});
  }
  return doc;
}

let fontPromise: Promise<{normal: string; bold: string; italic: string}> | undefined;
async function loadFonts() {
  fontPromise ??= Promise.all(["normal", "bold", "italic"].map(async style => {
    const response = await fetch(`/taste-fonts/Arial-${style}.ttf`);
    if (!response.ok) throw new Error("No se pudo cargar Arial para generar el PDF.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return [style, btoa(binary)];
  })).then(entries => Object.fromEntries(entries) as {normal: string; bold: string; italic: string}).catch(error => {fontPromise = undefined; throw error;});
  return fontPromise;
}
export async function downloadTastePdf(effect: number, selectedFlavor: FlavorStudy) {
  const fonts = await loadFonts();
  makeTastePdf(effect, selectedFlavor, fonts).save(`trabajo-campo-percepcion-gustativa-${selectedFlavor.id}.pdf`);
}
