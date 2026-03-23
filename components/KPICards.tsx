"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { filterMeetings } from "@/lib/utils";
import { useTimeFilter } from "./TimeFilterContext";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { CalendarCheck, CalendarX, XCircle, RefreshCw, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICard {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
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
  const { filter } = useTimeFilter();
  const { meetings: allMeetings, isLoading } = useMeetings();

  const stats = useMemo(() => {
    const meetings = filterMeetings(allMeetings, filter);
    const booked = meetings.filter((m) => m.status === "booked").length;
    const attended = meetings.filter((m) => m.status === "attended").length;
    const noShow = meetings.filter((m) => m.status === "no_show").length;
    const cancelled = meetings.filter((m) => m.status === "cancelled").length;
    const rescheduled = meetings.filter((m) => m.status === "rescheduled").length;
    const total = attended + noShow;
    const showRate = total > 0 ? Math.round((attended / total) * 100) : 0;
    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;
    return { booked, attended, noShow, cancelled, rescheduled, showRate, noShowRate };
  }, [allMeetings, filter]);

  if (isLoading) return <KPICardsSkeleton />;

  const cards: KPICard[] = [
    {
      label: "Total Booked",
      value: stats.booked,
      icon: <CalendarDays className="size-4" />,
      color: "text-blue-600",
    },
    {
      label: "Attended",
      value: stats.attended,
      sub: `${stats.showRate}% show rate`,
      icon: <CalendarCheck className="size-4" />,
      color: "text-green-600",
    },
    {
      label: "No-Show",
      value: stats.noShow,
      sub: `${stats.noShowRate}% of completed`,
      icon: <CalendarX className="size-4" />,
      color: "text-red-600",
    },
    {
      label: "Cancelled",
      value: stats.cancelled,
      icon: <XCircle className="size-4" />,
      color: "text-gray-500",
    },
    {
      label: "Rescheduled",
      value: stats.rescheduled,
      icon: <RefreshCw className="size-4" />,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
