"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { filterMeetingsByBookedOn } from "@/lib/utils";
import { useTimeFilter } from "./TimeFilterContext";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { CardType, Meeting } from "@/types";
import { CalendarCheck, CalendarClock, CalendarPlus, CalendarX, AlertCircle, FileWarning, UserX, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO } from "date-fns";

interface DemoCardDef {
  label: string;
  cardType: CardType;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

// Prospect attended: Zoom saw a non-TP participant (status='attended'),
// OR the deal's demo_status was marked completed.
function isAttended(m: Meeting): boolean {
  return m.status === 'attended' || m.demoStatus === 'completed';
}

// Prospect no-show: Zoom saw only TP participants (status='no_show'),
// OR the deal's demo_status was marked no_show.
function isNoShow(m: Meeting): boolean {
  return m.status === 'no_show' || m.demoStatus === 'no_show';
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
  const { filter, repFilter, clickedStatus, setClickedStatus } = useTimeFilter();
  const { meetings: allMeetings, compliance, isLoading } = useMeetings();

  const stats = useMemo(() => {
    // Cards filter by bookedOn (creation date) — answers "how many demos
    // got booked in this period?" rather than "…happened in this period?"
    let meetings = filterMeetingsByBookedOn(allMeetings, filter);
    if (repFilter) {
      meetings = meetings.filter((m) => m.leadOwner === repFilter || m.bookedBy === repFilter);
    }
    const now = new Date();
    const booked   = meetings.length;
    const upcoming = meetings.filter((m) => parseISO(m.meetingDate) > now).length;
    const attended = meetings.filter(isAttended).length;
    const noShow   = meetings.filter(isNoShow).length;
    const showable = attended + noShow;
    const showRate = showable > 0 ? Math.round((attended / showable) * 100) : 0;
    return { booked, upcoming, attended, noShow, showRate };
  }, [allMeetings, filter, repFilter]);

  // Compliance badges align with the cards' bookedOn filter so the
  // "X demos booked → Y missing a deal" narrative stays consistent.
  const complianceCounts = useMemo(() => {
    const ids = new Set(filterMeetingsByBookedOn(allMeetings, filter).map((m) => m.id));
    const inRange = (meetingId: string) => ids.has(meetingId);
    const repMatch = (ownerName: string) => !repFilter || ownerName === repFilter;

    return {
      noDeal: compliance.noDeal.filter((c) => inRange(c.meetingId) && repMatch(c.ownerName)).length,
      blankDemoStatus: compliance.blankDemoStatus.filter((c) => inRange(c.meetingId) && repMatch(c.ownerName)).length,
      noContact: compliance.noContact.filter((c) => inRange(c.meetingId) && repMatch(c.ownerName)).length,
      noLead: compliance.noLead.filter((c) => inRange(c.meetingId) && repMatch(c.ownerName)).length,
    };
  }, [allMeetings, compliance, filter, repFilter]);

  if (isLoading) return <KPICardsSkeleton />;

  const cards: DemoCardDef[] = [
    {
      label: "Booked",
      cardType: "booked",
      value: stats.booked,
      sub: "demos booked in period",
      icon: <CalendarPlus className="size-4" />,
      color: "text-blue-600",
    },
    {
      label: "Upcoming",
      cardType: "upcoming",
      value: stats.upcoming,
      sub: "scheduled, not yet held",
      icon: <CalendarClock className="size-4" />,
      color: "text-violet-600",
    },
    {
      label: "Attended",
      cardType: "attended",
      value: stats.attended,
      sub: `${stats.showRate}% show rate`,
      icon: <CalendarCheck className="size-4" />,
      color: "text-green-600",
    },
    {
      label: "No Show",
      cardType: "no_show",
      value: stats.noShow,
      icon: <CalendarX className="size-4" />,
      color: "text-red-600",
    },
  ];

  const totalCompliance = complianceCounts.noDeal + complianceCounts.blankDemoStatus + complianceCounts.noContact + complianceCounts.noLead;

  return (
    <div className="flex flex-col gap-3">
      {/* Total + compliance badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-3xl font-bold tabular-nums">{stats.booked}</span>
        <span className="text-sm text-muted-foreground">
          demos booked &nbsp;·&nbsp;
          {stats.upcoming} upcoming · {stats.attended} attended · {stats.noShow} no-show
        </span>
      </div>

      {/* Compliance warning badges */}
      {totalCompliance > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {complianceCounts.noDeal > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
              <FileWarning className="size-3" />
              {complianceCounts.noDeal} no deal
            </span>
          )}
          {complianceCounts.blankDemoStatus > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">
              <AlertCircle className="size-3" />
              {complianceCounts.blankDemoStatus} blank demo status
            </span>
          )}
          {complianceCounts.noContact > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 border border-orange-200">
              <UserX className="size-3" />
              {complianceCounts.noContact} no contact
            </span>
          )}
          {complianceCounts.noLead > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">
              <Users className="size-3" />
              {complianceCounts.noLead} no lead
            </span>
          )}
        </div>
      )}

      {/* 4 status cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => {
          const active = clickedStatus === card.cardType;
          return (
            <Card
              key={card.label}
              size="sm"
              onClick={() => setClickedStatus(active ? null : card.cardType)}
              className={cn(
                "transition-all duration-150 cursor-pointer hover:shadow-sm",
                active && "ring-2 ring-offset-1 ring-primary/40"
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
