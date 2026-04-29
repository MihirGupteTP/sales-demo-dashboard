"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useReps } from "@/lib/hooks/use-reps";
import { useTimeFilter } from "./TimeFilterContext";

export function RepFilter() {
  const { repFilter, setRepFilter } = useTimeFilter();
  const { reps } = useReps();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selectedSet = new Set(repFilter);
  function toggle(name: string) {
    if (selectedSet.has(name)) {
      setRepFilter(repFilter.filter((n) => n !== name));
    } else {
      setRepFilter([...repFilter, name]);
    }
  }

  const label =
    repFilter.length === 0
      ? "All Reps"
      : repFilter.length === 1
      ? repFilter[0]
      : `${repFilter.length} reps selected`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground min-w-[180px] justify-between"
      >
        <span className="truncate">{label}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {repFilter.length > 0 && (
            <X
              className="size-3.5 hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setRepFilter([]);
              }}
            />
          )}
          <ChevronDown className="size-4" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border border-border bg-popover shadow-md max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b border-border">
            <span>{repFilter.length} selected</span>
            {repFilter.length > 0 && (
              <button
                type="button"
                onClick={() => setRepFilter([])}
                className="hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <ul className="py-1">
            {reps.map((r) => {
              const checked = selectedSet.has(r.name);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => toggle(r.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                  >
                    <span className="size-4 inline-flex items-center justify-center rounded border border-border shrink-0">
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{r.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
