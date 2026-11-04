import { useCallback, useEffect, useMemo, useState } from "react";

import { flavorStudies } from "../flavorStudies";
import { flowSteps } from "../flowSteps";
import { participants } from "../participantResponses";
import { averageConfidence, filterParticipants, groupParticipants } from "../helpers/experimentMetrics";
import type { Group, Tab } from "../types";

export function useTasteExperiment() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [group, setGroup] = useState<Group>("all");
  const [selectedId, setSelectedId] = useState(participants[0]?.id ?? "");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [flowStep, setFlowStep] = useState(flowSteps.length - 1);
  const [selectedFlavorId, setSelectedFlavorId] = useState(flavorStudies[0]?.id ?? "");
  const [activeRound, setActiveRound] = useState(1);

  const visiblePeople = useMemo(() => filterParticipants(participants, group), [group]);
  const selected = useMemo(() => participants.find((person) => person.id === selectedId) ?? participants[0], [selectedId]);
  const selectedFlavor = useMemo(() => flavorStudies.find((flavor) => flavor.id === selectedFlavorId) ?? flavorStudies[0], [selectedFlavorId]);
  const { control, experimental } = useMemo(() => groupParticipants(participants), []);
  const controlMatch = averageConfidence(control);
  const experimentalMatch = averageConfidence(experimental);
  const effect = controlMatch - experimentalMatch;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setFlowStep((step) => (step + 1) % flowSteps.length), 1400);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const selectTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === "people") setShowDetails(true);
  }, []);

  const selectFlavor = useCallback((id: string) => {
    setSelectedFlavorId(id);
    const flavor = flavorStudies.find((item) => item.id === id);
    if (flavor) setActiveRound(flavor.round);
  }, []);

  return {
    activeTab, setActiveTab, selectTab, group, setGroup, visiblePeople, selected, selectedId, setSelectedId,
    isPlaying, setIsPlaying, showDetails, setShowDetails, flowStep, setFlowStep, selectedFlavorId, selectFlavor,
    activeRound, setActiveRound, selectedFlavor, controlMatch, experimentalMatch, effect, participants, flavorStudies,
    flowSteps, totalRounds: flavorStudies.length,
  };
}
