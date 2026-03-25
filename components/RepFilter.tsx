"use client";

import { useReps } from "@/lib/hooks/use-reps";
import { useTimeFilter } from "./TimeFilterContext";

export function RepFilter() {
  const { repFilter, setRepFilter } = useTimeFilter();
  const { reps } = useReps();

  return (
    <select
      value={repFilter ?? ""}
      onChange={(e) => setRepFilter(e.target.value || null)}
      className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
    >
      <option value="">All Reps</option>
      {reps.map((r) => (
        <option key={r.id} value={r.name}>{r.name}</option>
      ))}
    </select>
  );
}
