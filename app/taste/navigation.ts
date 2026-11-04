import type { Group, Tab } from "./types";

export const tabs: Array<{ id: Tab; label: string; short: string }> = [
  { id: "overview", label: "Panorama", short: "01" },
  { id: "people", label: "Participantes", short: "02" },
  { id: "results", label: "Resultados", short: "03" },
  { id: "method", label: "Metodología", short: "04" },
  { id: "conclusion", label: "Conclusiones", short: "05" },
];

export const groupLabel = (group: Group) =>
  group === "all" ? "Todos" : group === "control" ? "Grupo control" : "Grupo experimental";
