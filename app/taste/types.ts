export type Group = "all" | "control" | "experimental";
export type Tab = "overview" | "people" | "results" | "method" | "conclusion";

export type Participant = {
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

export type FlavorStudy = {
  id: string;
  actual: string;
  color: string;
  aroma: string;
  suggested: string;
  controlWords: string[];
  experimentalWords: string[];
  conclusion: string;
};

export type FlowStep = {
  title: string;
  label: string;
  detail: string;
};
