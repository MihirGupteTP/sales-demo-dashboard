"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { filterMeetings, deduplicateMeetingsByCustomer, computeAvgTimeToDemo } from "@/lib/utils";
import { useTimeFilter } from "./TimeFilterContext";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { MeetingStatus } from "@/types";
import { CalendarCheck, CalendarX, XCircle, RefreshCw, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardDef {
  label: string;
  status: MeetingStatus;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  selectedRing: string;
}

function KPICardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} size="sm">
          <CardHeader>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-12 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function KPICards() {
  const { filter, clickedStatus, setClickedStatus, repFilter } = useTimeFilter();
  const { meetings: allMeetings, isLoading } = useMeetings();

  const stats = useMemo(() => {
    let meetings = filterMeetings(allMeetings, filter);
    if (repFilter) {
      meetings = meetings.filter((m) => m.leadOwner === repFilter || m.bookedBy === repFilter);
    }
    // All counts are based on unique customers (1 demo per contact)
    const deduped = deduplicateMeetingsByCustomer(meetings);
    const total = deduped.length;
    const upcoming = deduped.filter((m) => m.status === "booked").length;
    const attended = deduped.filter((m) => m.status === "attended").length;
    const noShow = deduped.filter((m) => m.status === "no_show").length;
    const cancelled = deduped.filter((m) => m.status === "cancelled").length;
    const rescheduled = deduped.filter((m) => m.status === "rescheduled").length;
    const completed = attended + noShow;
    const showRate = completed > 0 ? Math.round((attended / completed) * 100) : 0;
    const noShowRate = completed > 0 ? Math.round((noShow / completed) * 100) : 0;
    const avgTimeToDemo = computeAvgTimeToDemo(deduped);
    return { total, upcoming, attended, noShow, cancelled, rescheduled, showRate, noShowRate, avgTimeToDemo };
  }, [allMeetings, filter, repFilter]);

  if (isLoading) return <KPICardsSkeleton />;

  const cards: KPICardDef[] = [
    {
      label: "Attended",
      status: "attended",
      value: stats.attended,
      sub: `${stats.showRate}% show rate`,
      icon: <CalendarCheck className="size-4" />,
      color: "text-green-600",
      selectedRing: "ring-green-400 bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Upcoming",
      status: "booked",
      value: stats.upcoming,
      icon: <CalendarDays className="size-4" />,
      color: "text-blue-600",
      selectedRing: "ring-blue-400 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "No-Show",
      status: "no_show",
      value: stats.noShow,
      sub: `${stats.noShowRate}% of completed`,
      icon: <CalendarX className="size-4" />,
      color: "text-red-600",
      selectedRing: "ring-red-400 bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Cancelled",
      status: "cancelled",
      value: stats.cancelled,
      icon: <XCircle className="size-4" />,
      color: "text-gray-500",
      selectedRing: "ring-gray-400 bg-gray-50 dark:bg-gray-900/30",
    },
    {
      label: "Rescheduled",
      status: "rescheduled",
      value: stats.rescheduled,
      icon: <RefreshCw className="size-4" />,
      color: "text-amber-600",
      selectedRing: "ring-amber-400 bg-amber-50 dark:bg-amber-950/30",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums">{stats.total}</span>
        <span className="text-sm text-muted-foreground">
          total unique demos &nbsp;=&nbsp;
          {stats.attended} attended + {stats.upcoming} upcoming + {stats.noShow} no-show + {stats.cancelled} cancelled + {stats.rescheduled} rescheduled
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
          const isSelected = clickedStatus === card.status;
          return (
            <button
              key={card.label}
              onClick={() => setClickedStatus(isSelected ? null : card.status)}
              className="text-left"
            >
              <Card
                size="sm"
                className={cn(
                  "transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
                  isSelected ? `ring-2 ${card.selectedRing}` : "hover:ring-1 hover:ring-border"
                )}
              >
                <CardHeader>
                  <div className={cn("flex items-center gap-1.5", card.color)}>
                    {card.icon}
                    <CardTitle className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                      {card.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-3xl font-bold tabular-nums", card.color)}>
                    {card.value}
                  </div>
                  {card.sub && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                  )}
                  <p className={cn(
                    "mt-1 text-xs font-medium transition-opacity",
                    isSelected ? "opacity-100 " + card.color : "opacity-0"
                  )}>
                    ↓ showing below
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="flex">
        <Card size="sm" className="w-48">
          <CardHeader>
            <div className="flex items-center gap-1.5 text-teal-600">
              <Clock className="size-4" />
              <CardTitle className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                Avg Time to Demo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-teal-600">
              {stats.avgTimeToDemo !== null ? `${stats.avgTimeToDemo.toFixed(1)}d` : "—"}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">booked → scheduled</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
