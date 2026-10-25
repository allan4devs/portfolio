
import type {
  FlavorStudy,
  FlowStep,
  Group,
  Participant,
  Tab,
} from "./types";

export const participants: Participant[] = [
  // GRUPO CONTROL
  {
    id: "kevin",
    name: "Kevin Rojas",
    age: 26,
    group: "control",
    sample: "C-01",
    actual: "Cas",
    label: "Cas",
    perceived: "Está bien ácido, sabe a fresco de cas.",
    confidence: 95,
    note: "Reconoció el sabor ácido del cas sin mostrar dudas.",
    color: "#a8c96b",
  },
  {
    id: "allan",
    name: "Allan Rojas",
    age: 35,
    group: "control",
    sample: "C-02",
    actual: "Mora",
    label: "Mora",
    perceived: "Sabe a mora, dulcecito pero con su toque ácido.",
    confidence: 92,
    note: "Identificó el sabor de mora y mencionó su combinación de dulce y ácido.",
    color: "#9b5ab5",
  },
  {
    id: "oscar",
    name: "Oscar Vindas",
    age: 43,
    group: "control",
    sample: "C-03",
    actual: "Tamarindo",
    label: "Tamarindo",
    perceived: "Uy, qué ácido. Es tamarindo, de fijo.",
    confidence: 97,
    note: "Reconoció el tamarindo por su acidez intensa y sabor característico.",
    color: "#b87942",
  },
  {
    id: "steve",
    name: "Steve Vindas",
    age: 21,
    group: "control",
    sample: "C-04",
    actual: "Guanábana",
    label: "Guanábana",
    perceived: "Está rico, bien dulce y cremosito. Es guanábana.",
    confidence: 91,
    note: "Relacionó la textura cremosa y el dulzor con la guanábana.",
    color: "#86c78d",
  },

  // GRUPO EXPERIMENTAL
  {
    id: "vallery",
    name: "Vallery",
    age: 16,
    group: "experimental",
    sample: "E-01",
    actual: "Cas",
    label: "Limón dulce",
    perceived: "Está ácido, pero sabe como a limonada.",
    confidence: 76,
    note: "Reconoció la acidez, pero la relacionó con limón en lugar de cas.",
    color: "#a8c96b",
  },
  {
    id: "tiffany",
    name: "Tiffany",
    age: 21,
    group: "experimental",
    sample: "E-02",
    actual: "Mora",
    label: "Uva",
    perceived: "Mmm, sabe como a fresco de uva, pero medio ácido.",
    confidence: 72,
    note: "Relacionó el sabor con uva, aunque percibió una acidez que le generó dudas.",
    color: "#9b5ab5",
  },
  {
    id: "meghan",
    name: "Meghan",
    age: 11,
    group: "experimental",
    sample: "E-03",
    actual: "Tamarindo",
    label: "Limón",
    perceived: "¡Ay, qué ácido! Parece limón, pero sabe raro.",
    confidence: 65,
    note: "Percibió claramente la acidez, pero no logró identificar el tamarindo.",
    color: "#b87942",
  },
  {
    id: "allana",
    name: "Allana",
    age: 5,
    group: "experimental",
    sample: "E-04",
    actual: "Guanábana",
    label: "Helado de vainilla",
    perceived: "¡Sabe a helado! Está rico y dulce.",
    confidence: 85,
    note: "Asoció el sabor dulce y la textura cremosa con un helado.",
    color: "#86c78d",
  },
];

export const flavorStudies: FlavorStudy[] = [
  {
    id: "cas",
    actual: "Cas",
    color: "#a8c96b",
    aroma: "frutal y ácido",
    suggested: "Limón dulce",
    controlWords: [
      "ácido",
      "cas",
      "refrescante",
    ],
    experimentalWords: [
      "limonada",
      "ácido",
      "cítrico",
    ],
    conclusion:
      "Kevin identificó el cas directamente, mientras que Vallery lo relacionó con limonada. La etiqueta pudo orientar su interpretación hacia un sabor cítrico conocido.",
  },
  {
    id: "mora",
    actual: "Mora",
    color: "#9b5ab5",
    aroma: "frutal y dulce",
    suggested: "Uva",
    controlWords: [
      "mora",
      "dulce",
      "ácido",
    ],
    experimentalWords: [
      "uva",
      "fresco",
      "ácido",
    ],
    conclusion:
      "Allan reconoció la mora, mientras que Tiffany la describió como un fresco de uva. La sugerencia pudo influir en la identificación de dos sabores frutales.",
  },
  {
    id: "tamarindo",
    actual: "Tamarindo",
    color: "#b87942",
    aroma: "frutal e intenso",
    suggested: "Limón",
    controlWords: [
      "tamarindo",
      "muy ácido",
      "intenso",
    ],
    experimentalWords: [
      "limón",
      "ácido",
      "raro",
    ],
    conclusion:
      "Oscar reconoció el tamarindo por su acidez, mientras que Meghan lo relacionó con limón, aunque notó que el sabor no coincidía completamente.",
  },
  {
    id: "guanabana",
    actual: "Guanábana",
    color: "#86c78d",
    aroma: "tropical y dulce",
    suggested: "Helado de vainilla",
    controlWords: [
      "guanábana",
      "dulce",
      "cremoso",
    ],
    experimentalWords: [
      "helado",
      "rico",
      "dulce",
    ],
    conclusion:
      "Steve identificó la guanábana, mientras que Allana la relacionó con helado. Su respuesta ilustra cómo una etiqueta familiar puede orientar la descripción de un sabor.",
  },
];

export const flowSteps: FlowStep[] = [
  {
    title: "Preparar",
    label: "Frescos de frutas",
    detail:
      "Se preparan muestras de cas, mora, tamarindo y guanábana. Cada pareja recibe la misma preparación, cantidad y temperatura.",
  },
  {
    title: "Presentar",
    label: "Etiquetas diferentes",
    detail:
      "El grupo control observa el nombre verdadero. El grupo experimental recibe una etiqueta que sugiere otro sabor.",
  },
  {
    title: "Probar",
    label: "¿A qué le sabe?",
    detail:
      "Cada participante prueba su muestra y explica con sus propias palabras qué sabor siente, sin recibir pistas adicionales.",
  },
  {
    title: "Registrar",
    label: "Respuesta espontánea",
    detail:
      "Se anotan las frases originales y el nivel de seguridad. Con los niños se utilizan preguntas sencillas y apropiadas para su edad.",
  },
];

export const tabs: {
  id: Tab;
  label: string;
  short: string;
}[] = [
  { id: "overview", label: "Panorama", short: "01" },
  { id: "people", label: "Participantes", short: "02" },
  { id: "results", label: "Resultados", short: "03" },
  { id: "method", label: "Metodología", short: "04" },
  { id: "conclusion", label: "Conclusiones", short: "05" },
];

export const groupLabel = (group: Group) =>
  group === "all"
    ? "Todos"
    : group === "control"
      ? "Grupo control"
      : "Grupo experimental";
