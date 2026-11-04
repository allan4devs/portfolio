import { participantAnswers } from "./constants";
import type { Participant } from "./types";

type ParticipantProfile = Omit<Participant, "perceived" | "confidence" | "note">;

/** Perfiles con las parejas kiwi/cas, naranja/limón y fresa/sandía. */
const participantProfiles: ParticipantProfile[] = [
  {
    id: "kevin",
    name: "Kevin Rojas",
    age: 26,
    group: "control",
    sample: "C-01",
    actual: "Kiwi",
    label: "Kiwi",
    color: "#8ebf4f",
  },
  {
    id: "allan",
    name: "Allan Rojas",
    age: 35,
    group: "control",
    sample: "C-02",
    actual: "Cas",
    label: "Cas",
    color: "#b6ce72",
  },
  {
    id: "oscar",
    name: "Oscar Vindas",
    age: 43,
    group: "control",
    sample: "C-03",
    actual: "Naranja",
    label: "Naranja",
    color: "#f49a38",
  },
  {
    id: "steve",
    name: "Steve Vindas",
    age: 21,
    group: "control",
    sample: "C-04",
    actual: "Limón",
    label: "Limón",
    color: "#f4c84e",
  },
  {
    id: "daniel",
    name: "Daniel",
    age: 16,
    group: "experimental",
    sample: "E-01",
    actual: "Kiwi",
    label: "Cas",
    color: "#8ebf4f",
  },
  {
    id: "tiffany",
    name: "Tiffany",
    age: 21,
    group: "experimental",
    sample: "E-02",
    actual: "Naranja",
    label: "Limón",
    color: "#f49a38",
  },
  {
    id: "meghan",
    name: "Meghan",
    age: 11,
    group: "experimental",
    sample: "E-03",
    actual: "Fresa",
    label: "Sandía",
    color: "#e95865",
  },
  {
    id: "alana",
    name: "Alana",
    age: 5,
    group: "experimental",
    sample: "E-04",
    actual: "Sandía",
    label: "Fresa",
    color: "#ef7180",
  },
];

/** Une el perfil con la respuesta correspondiente por id. */
export const participants: Participant[] = participantProfiles.map((profile) => {
  const answer = participantAnswers.find(
    (candidate) => candidate.id === profile.id,
  );

  if (!answer) {
    throw new Error(`Missing answer for participant: ${profile.id}`);
  }

  return { ...profile, ...answer };
});