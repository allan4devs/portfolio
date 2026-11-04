import type { Group, Participant } from "../types";

export function averageConfidence(participants: Participant[]) {
  if (!participants.length) return 0;
  return Math.round(participants.reduce((total, person) => total + person.confidence, 0) / participants.length);
}

export function filterParticipants(participants: Participant[], group: Group) {
  return group === "all" ? participants : participants.filter((person) => person.group === group);
}

export function groupParticipants(participants: Participant[]) {
  return {
    control: participants.filter((person) => person.group === "control"),
    experimental: participants.filter((person) => person.group === "experimental"),
  };
}
