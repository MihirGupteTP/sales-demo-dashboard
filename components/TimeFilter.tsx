"use client";

import { cn } from "@/lib/utils";
import { useTimeFilter } from "./TimeFilterContext";
import { TimeRange } from "@/types";
import { useState } from "react";

const RANGES: { label: string; value: TimeRange }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom", value: "custom" },
];

export function TimeFilter() {
  const { filter, setFilter } = useTimeFilter();
  const [customStart, setCustomStart] = useState(filter.customStart ?? "");
  const [customEnd, setCustomEnd] = useState(filter.customEnd ?? "");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-border bg-muted p-0.5 gap-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setFilter({ range: r.value, customStart, customEnd })}
            className={cn(
              "px-3 py-1 text-sm rounded-md font-medium transition-all",
              filter.range === r.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {filter.range === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              setFilter({ range: "custom", customStart: e.target.value, customEnd });
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              setFilter({ range: "custom", customStart, customEnd: e.target.value });
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
