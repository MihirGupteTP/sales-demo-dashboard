"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { useTimeFilter } from "./TimeFilterContext";
import { Meeting, MeetingStatus } from "@/types";
import { STATUS_CONFIG, filterMeetings, cn } from "@/lib/utils";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths,
} from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

const AZ_TZ = "America/Phoenix";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

const STATUS_DOT: Record<MeetingStatus, string> = {
  booked: "bg-blue-500",
  attended: "bg-green-500",
  no_show: "bg-red-500",
  cancelled: "bg-gray-400",
  rescheduled: "bg-amber-500",
};

export function CalendarView() {
  const { meetings: allMeetings } = useMeetings();
  const { filter, repFilter } = useTimeFilter();
  // Initialise to today in AZ time so month navigation is AZ-correct
  const [currentMonth, setCurrentMonth] = useState(() => toZonedTime(new Date(), AZ_TZ));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const meetings = useMemo(() => {
    let filtered = filterMeetings(allMeetings, filter);
    if (repFilter) filtered = filtered.filter((m) => m.leadOwner === repFilter || m.bookedBy === repFilter);
    return filtered;
  }, [allMeetings, filter, repFilter]);

  // "today" in AZ — used to highlight the correct cell
  const todayKeyAz = formatInTimeZone(new Date(), AZ_TZ, "yyyy-MM-dd");

  const meetingsByDay = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    for (const m of meetings) {
      // Key meetings by their AZ date, not UTC date
      const key = formatInTimeZone(new Date(m.meetingDate), AZ_TZ, "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [meetings]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedMeetings = selectedDay
    ? (meetingsByDay[format(selectedDay, "yyyy-MM-dd")] ?? [])
    : [];

  // selectedDay header label (AZ date)
  const selectedDayLabel = selectedDay ? format(selectedDay, "EEEE, MMMM d") : "";

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <CardTitle>Meeting Calendar</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayMeetings = meetingsByDay[key] ?? [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const today = key === todayKeyAz;

            // Summarize status dots (max 3 visible)
            const dots = dayMeetings.slice(0, 3);

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "min-h-14 p-1.5 flex flex-col items-start bg-background transition-colors text-left",
                  !isCurrentMonth && "opacity-40",
                  isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                  !isSelected && "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium mb-1 size-5 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground",
                    !today && isCurrentMonth && "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayMeetings.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 w-full">
                    {dots.map((m, i) => (
                      <span
                        key={i}
                        className={cn("size-1.5 rounded-full shrink-0", STATUS_DOT[m.status])}
                      />
                    ))}
                    {dayMeetings.length > 3 && (
                      <span className="text-[9px] text-muted-foreground leading-none">
                        +{dayMeetings.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {dayMeetings.length > 0 && (
                  <span className="text-[10px] text-muted-foreground mt-auto">
                    {dayMeetings.length} mtg{dayMeetings.length > 1 ? "s" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {(Object.entries(STATUS_DOT) as [MeetingStatus, string][]).map(([status, dot]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", dot)} />
              <span className="text-xs text-muted-foreground">{STATUS_CONFIG[status].label}</span>
            </div>
          ))}
        </div>

        {/* Selected day meetings */}
        {selectedDay && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">
              {selectedDayLabel}
              <span className="ml-2 text-muted-foreground font-normal">
                ({selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? "s" : ""})
              </span>
            </h3>
            {selectedMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings on this day.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedMeetings
                  .sort((a, b) => parseISO(a.meetingDate).getTime() - parseISO(b.meetingDate).getTime())
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 rounded-lg border border-border p-2.5 bg-muted/30"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{m.name}</span>
                          <StatusBadge status={m.status} />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          <span>{formatInTimeZone(new Date(m.meetingDate), AZ_TZ, "h:mm a")}</span>
                          <span>Lead: {m.leadOwner}</span>
                          <span>Stage: {m.dealStage}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
