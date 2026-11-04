export type Participant = {
  id: string;
  name: string;
  age: number;
  group: "control" | "experimental";
  sample: string;
  actual: string;
  label: string;
  perceived: string;
  confidence: number;
  note: string;
  color: string;
};
