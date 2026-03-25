"use client";

import { Fragment, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { filterMeetings, computeRepStats, deduplicateMeetingsByCustomer } from "@/lib/utils";
import { useTimeFilter } from "./TimeFilterContext";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { useReps } from "@/lib/hooks/use-reps";
import { SalesTeam } from "@/types";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { parseISO } from "date-fns";

type SortKey = "attended" | "booked" | "noShow" | "showRate" | "upcomingCount";

const RANK_STYLES = [
  "bg-amber-400 text-white", // gold
  "bg-gray-300 text-gray-800", // silver
  "bg-amber-600 text-white", // bronze
];

function LeaderboardSkeleton() {
  return (
    <Card>
      <CardHeader><div className="h-5 w-32 animate-pulse rounded bg-muted" /></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="size-6 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="ml-auto flex gap-6">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-4 w-8 animate-pulse rounded bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Leaderboard() {
  const { filter, repFilter } = useTimeFilter();
  const { meetings: allMeetings, isLoading: meetingsLoading } = useMeetings();
  const { reps, isLoading: repsLoading } = useReps();
  const isLoading = meetingsLoading || repsLoading;
  const [sortKey, setSortKey] = useState<SortKey>("attended");
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [teamTab, setTeamTab] = useState<SalesTeam | "All">("All");
  const TABS: (SalesTeam | "All")[] = ["All", "SME AE", "SME SDR"];

  const repStats = useMemo(() => {
    let meetings = filterMeetings(allMeetings, filter);
    if (repFilter) meetings = meetings.filter((m) => m.leadOwner === repFilter || m.bookedBy === repFilter);
    return computeRepStats(deduplicateMeetingsByCustomer(meetings), reps)
      .filter((s) => teamTab === "All" || s.rep.team === teamTab)
      .sort((a, b) => {
        const av = a[sortKey] as number;
        const bv = b[sortKey] as number;
        return bv - av;
      });
  }, [allMeetings, reps, filter, repFilter, sortKey, teamTab]);

  const repMeetings = useMemo(() => {
    let meetings = filterMeetings(allMeetings, filter);
    if (repFilter) meetings = meetings.filter((m) => m.leadOwner === repFilter || m.bookedBy === repFilter);
    meetings = deduplicateMeetingsByCustomer(meetings);
    const now = new Date();
    const map: Record<string, typeof meetings> = {};
    for (const m of meetings) {
      if (parseISO(m.meetingDate) > now) {
        if (!map[m.leadOwner]) map[m.leadOwner] = [];
        map[m.leadOwner].push(m);
      }
    }
    return map;
  }, [allMeetings, filter, repFilter]);

  if (isLoading) return <LeaderboardSkeleton />;

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        className={cn(
          "flex items-center gap-1 font-medium",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setSortKey(k)}
      >
        {label}
        {active ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3 opacity-30" />}
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            <CardTitle>Rep Leaderboard</CardTitle>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setTeamTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  teamTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">#</TableHead>
              <TableHead>Rep</TableHead>
              <TableHead><SortHeader label="Booked" k="booked" /></TableHead>
              <TableHead><SortHeader label="Attended" k="attended" /></TableHead>
              <TableHead><SortHeader label="No-Show" k="noShow" /></TableHead>
              <TableHead><SortHeader label="Show Rate" k="showRate" /></TableHead>
              <TableHead><SortHeader label="Upcoming" k="upcomingCount" /></TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {repStats.map((s, idx) => (
              <Fragment key={s.rep.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedRep(expandedRep === s.rep.name ? null : s.rep.name)
                  }
                >
                  <TableCell className="pl-4">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                        idx < 3 ? RANK_STYLES[idx] : "bg-muted text-muted-foreground"
                      )}
                    >
                      {idx + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {s.rep.initials}
                      </div>
                      <span className="font-medium">{s.rep.name}</span>
                      {teamTab === "All" && (
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          s.rep.team === "SME AE"  ? "bg-blue-100 text-blue-700" :
                                                     "bg-violet-100 text-violet-700"
                        )}>
                          {s.rep.team}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{s.booked}</TableCell>
                  <TableCell className="tabular-nums text-green-700 font-medium">{s.attended}</TableCell>
                  <TableCell className="tabular-nums text-red-600">{s.noShow}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{ width: `${s.showRate}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs">{s.showRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums text-blue-600 font-medium">{s.upcomingCount}</TableCell>
                  <TableCell className="pr-4">
                    {expandedRep === s.rep.name ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>

                {expandedRep === s.rep.name && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={8} className="px-4 py-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Upcoming meetings for {s.rep.name}
                      </div>
                      {(repMeetings[s.rep.name] ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No upcoming meetings in this period.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {repMeetings[s.rep.name].map((m) => (
                            <div key={m.id} className="flex items-center gap-3 text-sm">
                              <StatusBadge status={m.status} />
                              <span className="font-medium">{m.name}</span>
                              <span className="text-muted-foreground">{formatDateTime(m.meetingDate)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
