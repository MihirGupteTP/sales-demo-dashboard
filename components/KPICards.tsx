"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { filterDeals } from "@/lib/utils";
import { useTimeFilter } from "./TimeFilterContext";
import { useDeals } from "@/lib/hooks/use-deals";
import { DemoStatus } from "@/types";
import { CalendarCheck, CalendarClock, CalendarX, MinusCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoCardDef {
  label: string;
  status: DemoStatus;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  selectedRing: string;
}

function KPICardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
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
  const { filter, repFilter } = useTimeFilter();
  const { deals: allDeals, isLoading } = useDeals();

  const stats = useMemo(() => {
    let deals = filterDeals(allDeals, filter);
    if (repFilter) {
      deals = deals.filter((d) => d.ownerName === repFilter);
    }
    const total = deals.length;
    const scheduled   = deals.filter((d) => d.demoStatus === "scheduled").length;
    const completed   = deals.filter((d) => d.demoStatus === "completed").length;
    const noShow      = deals.filter((d) => d.demoStatus === "no_show").length;
    const notNeeded   = deals.filter((d) => d.demoStatus === "not_needed").length;
    const unset       = deals.filter((d) => d.demoStatus === "unset").length;
    const showableDemos = completed + noShow;
    const showRate = showableDemos > 0 ? Math.round((completed / showableDemos) * 100) : 0;
    return { total, scheduled, completed, noShow, notNeeded, unset, showRate };
  }, [allDeals, filter, repFilter]);

  if (isLoading) return <KPICardsSkeleton />;

  const cards: DemoCardDef[] = [
    {
      label: "Scheduled",
      status: "scheduled",
      value: stats.scheduled,
      sub: "demo booked",
      icon: <CalendarClock className="size-4" />,
      color: "text-blue-600",
      selectedRing: "ring-blue-400 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Completed",
      status: "completed",
      value: stats.completed,
      sub: `${stats.showRate}% show rate`,
      icon: <CalendarCheck className="size-4" />,
      color: "text-green-600",
      selectedRing: "ring-green-400 bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "No-Show",
      status: "no_show",
      value: stats.noShow,
      icon: <CalendarX className="size-4" />,
      color: "text-red-600",
      selectedRing: "ring-red-400 bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Not Needed",
      status: "not_needed",
      value: stats.notNeeded,
      sub: "closed without demo",
      icon: <MinusCircle className="size-4" />,
      color: "text-violet-600",
      selectedRing: "ring-violet-400 bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Total + unset warning */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-3xl font-bold tabular-nums">{stats.total}</span>
        <span className="text-sm text-muted-foreground">
          total deals &nbsp;=&nbsp;
          {stats.scheduled} scheduled + {stats.completed} completed + {stats.noShow} no-show + {stats.notNeeded} not needed
        </span>
        {stats.unset > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            <AlertCircle className="size-3" />
            {stats.unset} demo status not set
          </span>
        )}
      </div>

      {/* 4 status cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.label}
            size="sm"
            className="transition-all duration-150"
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
