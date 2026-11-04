"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

import { useTasteExperiment } from "../hooks/useTasteExperiment";

type TasteContextValue = ReturnType<typeof useTasteExperiment>;
const TasteContext = createContext<TasteContextValue | null>(null);

export function TasteProvider({ children }: PropsWithChildren) {
  const value = useTasteExperiment();
  return <TasteContext.Provider value={value}>{children}</TasteContext.Provider>;
}

export function useTasteContext() {
  const context = useContext(TasteContext);
  if (!context) throw new Error("useTasteContext must be used inside TasteProvider");
  return context;
}
