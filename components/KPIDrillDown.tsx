"use client";

import { useMemo, useState } from "react";
import { useTimeFilter } from "./TimeFilterContext";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { filterMeetings, formatDateTime, formatDate, STATUS_CONFIG } from "@/lib/utils";
import { MeetingDetailSheet } from "./MeetingDetailSheet";
import { StatusBadge } from "./StatusBadge";
import { Meeting } from "@/types";
import { X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_HEADING: Record<string, string> = {
  booked:      "Total Booked",
  attended:    "Attended",
  no_show:     "No-Show",
  cancelled:   "Cancelled",
  rescheduled: "Rescheduled",
};

const STATUS_ACCENT: Record<string, string> = {
  booked:      "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20",
  attended:    "border-green-200 bg-green-50/50 dark:bg-green-950/20",
  no_show:     "border-red-200 bg-red-50/50 dark:bg-red-950/20",
  cancelled:   "border-gray-200 bg-gray-50/50 dark:bg-gray-900/20",
  rescheduled: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
};

export function KPIDrillDown() {
  const { filter, clickedStatus, setClickedStatus } = useTimeFilter();
  const { meetings: allMeetings } = useMeetings();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const meetings = useMemo(() => {
    if (!clickedStatus) return [];
    return filterMeetings(allMeetings, filter)
      .filter((m) => m.status === clickedStatus)
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  }, [allMeetings, filter, clickedStatus]);

  if (!clickedStatus) return null;

  const cfg = STATUS_CONFIG[clickedStatus];

  return (
    <>
      <MeetingDetailSheet meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />

      <div className={cn("rounded-xl border p-4 transition-all", STATUS_ACCENT[clickedStatus])}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              cfg.className
            )}>
              {cfg.label}
            </span>
            <h3 className="font-semibold text-sm">
              {STATUS_HEADING[clickedStatus]}
              <span className="ml-2 text-muted-foreground font-normal">
                — {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/meetings?status=${clickedStatus}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
            <button
              onClick={() => setClickedStatus(null)}
              className="rounded-md p-1 hover:bg-muted transition-colors"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Meeting rows */}
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No meetings in this period.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Meeting</span>
              <span>Meeting Date</span>
              <span>Booked On</span>
              <span>Lead Owner</span>
              <span>Deal Stage</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {meetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMeeting(m)}
                  className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.company}</p>
                  </div>
                  <span className="text-xs text-muted-foreground self-center">
                    {formatDateTime(m.meetingDate)}
                  </span>
                  <span className="text-xs text-muted-foreground self-center">
                    {formatDate(m.bookedOn)}
                  </span>
                  <div className="flex items-center gap-1.5 self-center min-w-0">
                    <div className="size-5 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {m.leadOwner.split(" ").map((w) => w[0]).join("")}
                    </div>
                    <span className="text-xs truncate">{m.leadOwner}</span>
                  </div>
                  <span className="text-xs text-muted-foreground self-center truncate">
                    {m.dealStage}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
