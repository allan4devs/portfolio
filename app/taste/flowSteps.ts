import type { FlowStep } from "./types";

/** Secuencia visual del experimento. */
export const flowSteps: FlowStep[] = [
  { title: "Preparar", label: "Cinco sabores diferentes", detail: "Se sirven kiwi, menta, sandía, fresa y limón en porciones iguales. La cantidad, el volumen y la temperatura se mantienen constantes." },
  { title: "Presentar", label: "Etiquetas diferentes", detail: "En cada ronda, el grupo control ve el nombre verdadero y el experimental recibe el nombre de otro sabor conocido." },
  { title: "Probar", label: "¿Qué nota primero?", detail: "Cada participante prueba la muestra y dice qué nota primero, usando sus propias palabras y sin recibir más pistas." },
  { title: "Registrar", label: "Respuesta espontánea", detail: "Se registra la primera frase y una confianza de 0 a 100. Con los niños se usan preguntas sencillas, adecuadas para su edad." },
];
