"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { filterMeetings, formatDateTime, formatDate } from "@/lib/utils";
import { useTimeFilter } from "./TimeFilterContext";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { useReps } from "@/lib/hooks/use-reps";
import { Meeting, MeetingStatus } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { MeetingDetailSheet } from "./MeetingDetailSheet";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_STATUSES: MeetingStatus[] = ["booked", "attended", "no_show", "cancelled", "rescheduled"];
const STATUS_LABELS: Record<MeetingStatus, string> = {
  booked: "Booked",
  attended: "Attended",
  no_show: "No-Show",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

type SortKey = "name" | "bookedOn" | "meetingDate" | "status" | "leadOwner";
type SortDir = "asc" | "desc";

export function MeetingsTable() {
  const { filter } = useTimeFilter();
  const { meetings: allMeetings, isLoading: meetingsLoading } = useMeetings();
  const { reps, isLoading: repsLoading } = useReps();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus[]>(() => {
    const s = searchParams.get("status") as MeetingStatus | null;
    return s && ALL_STATUSES.includes(s) ? [s] : [];
  });
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("meetingDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const repNames = useMemo(() => reps.map((r) => r.name), [reps]);

  const meetings = useMemo(() => {
    let list = filterMeetings(allMeetings, filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.company.toLowerCase().includes(q) ||
          m.leadOwner.toLowerCase().includes(q)
      );
    }

    if (statusFilter.length > 0) {
      list = list.filter((m) => statusFilter.includes(m.status));
    }

    if (ownerFilter) {
      list = list.filter((m) => m.leadOwner === ownerFilter || m.dealOwner === ownerFilter);
    }

    list = [...list].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") { av = a.name; bv = b.name; }
      else if (sortKey === "bookedOn") { av = a.bookedOn; bv = b.bookedOn; }
      else if (sortKey === "meetingDate") { av = a.meetingDate; bv = b.meetingDate; }
      else if (sortKey === "status") { av = a.status; bv = b.status; }
      else if (sortKey === "leadOwner") { av = a.leadOwner; bv = b.leadOwner; }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [allMeetings, filter, search, statusFilter, ownerFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown className="size-3 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp className="size-3" />
      : <ChevronDown className="size-3" />;
  }

  function toggleStatus(s: MeetingStatus) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  const isLoading = meetingsLoading || repsLoading;

  return (
    <>
      <MeetingDetailSheet meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            placeholder="Search meetings, companies, reps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                statusFilter.includes(s)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Owner filter */}
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
        >
          <option value="">All Reps</option>
          {repNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>
                  Meeting <SortIcon k="name" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => toggleSort("bookedOn")}>
                  Booked On <SortIcon k="bookedOn" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => toggleSort("meetingDate")}>
                  Meeting Date <SortIcon k="meetingDate" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => toggleSort("status")}>
                  Status <SortIcon k="status" />
                </button>
              </TableHead>
              <TableHead>Lead Status</TableHead>
              <TableHead>Deal Stage</TableHead>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => toggleSort("leadOwner")}>
                  Lead Owner <SortIcon k="leadOwner" />
                </button>
              </TableHead>
              <TableHead>Deal Owner</TableHead>
              <TableHead>Booked By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${60 + (j * 13) % 40}%` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No meetings found.
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedMeeting(m)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.company}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(m.bookedOn)}</TableCell>
                  <TableCell>{formatDateTime(m.meetingDate)}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted text-foreground rounded-full px-2 py-0.5">
                      {m.leadStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{m.dealStage}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {m.leadOwner.split(" ").map((w) => w[0]).join("")}
                      </div>
                      <span className="text-sm">{m.leadOwner}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {m.dealOwner.split(" ").map((w) => w[0]).join("")}
                      </div>
                      <span className="text-sm">{m.dealOwner}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        m.bookedBy === m.leadOwner
                          ? "bg-primary/10 text-primary"
                          : "bg-violet-100 text-violet-700"
                      )}>
                        {m.bookedBy.split(" ").map((w) => w[0]).join("")}
                      </div>
                      <span className="text-sm">{m.bookedBy}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Showing {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
      </p>
    </>
  );
}
