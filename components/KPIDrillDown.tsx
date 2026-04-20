"use client";

import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { useTimeFilter } from "./TimeFilterContext";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { filterMeetingsByBookedOn, deduplicateMeetingsByCustomer, formatDateTime } from "@/lib/utils";
import { MeetingDetailSheet } from "./MeetingDetailSheet";
import { CardType, Meeting } from "@/types";
import { X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const CARD_HEADING: Record<CardType, string> = {
  booked:   "Booked",
  upcoming: "Upcoming",
  attended: "Attended",
  no_show:  "No Show",
};

const CARD_BADGE: Record<CardType, string> = {
  booked:   "bg-blue-100 text-blue-700 border-blue-200",
  upcoming: "bg-violet-100 text-violet-700 border-violet-200",
  attended: "bg-green-100 text-green-700 border-green-200",
  no_show:  "bg-red-100 text-red-700 border-red-200",
};

const CARD_ACCENT: Record<CardType, string> = {
  booked:   "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20",
  upcoming: "border-violet-200 bg-violet-50/50 dark:bg-violet-950/20",
  attended: "border-green-200 bg-green-50/50 dark:bg-green-950/20",
  no_show:  "border-red-200 bg-red-50/50 dark:bg-red-950/20",
};

// Must mirror KPICards logic — keep these in sync.
function matchesCard(m: Meeting, card: CardType, now: Date): boolean {
  switch (card) {
    case "booked":   return true;
    case "upcoming": return parseISO(m.meetingDate) > now;
    case "attended": return m.status === "attended" || m.demoStatus === "completed";
    case "no_show":  return m.status === "no_show"  || m.demoStatus === "no_show";
  }
}

function RepCell({ name, highlight = false }: { name: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 self-center min-w-0">
      <div className={cn(
        "size-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold",
        highlight ? "bg-violet-100 text-violet-700" : "bg-primary/10 text-primary"
      )}>
        {name.split(" ").map((w) => w[0]).join("")}
      </div>
      <span className="text-xs truncate">{name}</span>
    </div>
  );
}

export function KPIDrillDown() {
  const { filter, clickedStatus, setClickedStatus, repFilter } = useTimeFilter();
  const { meetings: allMeetings } = useMeetings();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const meetings = useMemo(() => {
    if (!clickedStatus) return [];
    const now = new Date();
    let filtered = filterMeetingsByBookedOn(allMeetings, filter);
    if (repFilter) filtered = filtered.filter((m) => m.leadOwner === repFilter || m.bookedBy === repFilter);
    return deduplicateMeetingsByCustomer(filtered)
      .filter((m) => matchesCard(m, clickedStatus, now))
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  }, [allMeetings, filter, repFilter, clickedStatus]);

  if (!clickedStatus) return null;

  return (
    <>
      <MeetingDetailSheet meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />

      <div className={cn("rounded-xl border p-4 transition-all", CARD_ACCENT[clickedStatus])}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              CARD_BADGE[clickedStatus]
            )}>
              {CARD_HEADING[clickedStatus]}
            </span>
            <h3 className="font-semibold text-sm text-muted-foreground font-normal">
              {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/meetings?card=${clickedStatus}`}
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
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Meeting</span>
              <span>Meeting Date</span>
              <span>Booked By</span>
              <span>Lead Owner</span>
              <span>Deal Owner</span>
              <span>Deal Stage</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {meetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMeeting(m)}
                  className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.company}</p>
                  </div>
                  <span className="text-xs text-muted-foreground self-center">
                    {formatDateTime(m.meetingDate)}
                  </span>
                  <RepCell name={m.bookedBy} highlight={m.bookedBy !== m.leadOwner} />
                  <RepCell name={m.leadOwner} />
                  <RepCell name={m.dealOwner} />
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
