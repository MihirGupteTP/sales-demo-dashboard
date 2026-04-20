"use client";

import React, { createContext, useContext, useState } from "react";
import { DateFilter, CardType } from "@/types";

interface TimeFilterContextValue {
  filter: DateFilter;
  setFilter: (f: DateFilter) => void;
  clickedStatus: CardType | null;
  setClickedStatus: (s: CardType | null) => void;
  repFilter: string | null;
  setRepFilter: (r: string | null) => void;
}

const TimeFilterContext = createContext<TimeFilterContextValue>({
  filter: { range: "month" },
  setFilter: () => {},
  clickedStatus: null,
  setClickedStatus: () => {},
  repFilter: null,
  setRepFilter: () => {},
});

export function TimeFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<DateFilter>({ range: "month" });
  const [clickedStatus, setClickedStatus] = useState<CardType | null>(null);
  const [repFilter, setRepFilter] = useState<string | null>(null);
  return (
    <TimeFilterContext.Provider value={{ filter, setFilter, clickedStatus, setClickedStatus, repFilter, setRepFilter }}>
      {children}
    </TimeFilterContext.Provider>
  );
}

export function useTimeFilter() {
  return useContext(TimeFilterContext);
}
