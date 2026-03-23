"use client";

import React, { createContext, useContext, useState } from "react";
import { DateFilter, MeetingStatus } from "@/types";

interface TimeFilterContextValue {
  filter: DateFilter;
  setFilter: (f: DateFilter) => void;
  clickedStatus: MeetingStatus | null;
  setClickedStatus: (s: MeetingStatus | null) => void;
}

const TimeFilterContext = createContext<TimeFilterContextValue>({
  filter: { range: "month" },
  setFilter: () => {},
  clickedStatus: null,
  setClickedStatus: () => {},
});

export function TimeFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<DateFilter>({ range: "month" });
  const [clickedStatus, setClickedStatus] = useState<MeetingStatus | null>(null);
  return (
    <TimeFilterContext.Provider value={{ filter, setFilter, clickedStatus, setClickedStatus }}>
      {children}
    </TimeFilterContext.Provider>
  );
}

export function useTimeFilter() {
  return useContext(TimeFilterContext);
}
