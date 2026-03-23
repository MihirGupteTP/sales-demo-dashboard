"use client";

import React, { createContext, useContext, useState } from "react";
import { DateFilter } from "@/types";

interface TimeFilterContextValue {
  filter: DateFilter;
  setFilter: (f: DateFilter) => void;
}

const TimeFilterContext = createContext<TimeFilterContextValue>({
  filter: { range: "month" },
  setFilter: () => {},
});

export function TimeFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<DateFilter>({ range: "month" });
  return (
    <TimeFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </TimeFilterContext.Provider>
  );
}

export function useTimeFilter() {
  return useContext(TimeFilterContext);
}
