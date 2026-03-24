"use client";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Meeting } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime, formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { User, Briefcase, Calendar, Clock, Tag, Building2 } from "lucide-react";

interface Props {
  meeting: Meeting | null;
  onClose: () => void;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function MeetingDetailSheet({ meeting, onClose }: Props) {
  return (
    <Sheet open={!!meeting} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {meeting && (
          <>
            <SheetHeader className="pb-4">
              <SheetTitle className="pr-8 leading-snug">{meeting.name}</SheetTitle>
              <SheetDescription>
                <span className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={meeting.status} />
                  <span className="text-xs text-muted-foreground">{meeting.company}</span>
                  {meeting.needsTypeSet && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      ⚠ Set meeting type to Demo in HubSpot
                    </span>
                  )}
                </span>
              </SheetDescription>
            </SheetHeader>

            <Separator />

            <div className="flex flex-col gap-4 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Meeting Details
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <DetailRow
                  icon={<Calendar className="size-4" />}
                  label="Meeting Date & Time"
                  value={formatDateTime(meeting.meetingDate)}
                />
                <DetailRow
                  icon={<Clock className="size-4" />}
                  label="Booked On"
                  value={formatDate(meeting.bookedOn)}
                />
                <DetailRow
                  icon={<Building2 className="size-4" />}
                  label="Company"
                  value={meeting.company}
                />
              </div>

              <Separator />

              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                CRM Info
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <DetailRow
                  icon={<Tag className="size-4" />}
                  label="Lead Status"
                  value={meeting.leadStatus}
                />
                <DetailRow
                  icon={<Briefcase className="size-4" />}
                  label="Deal Stage"
                  value={meeting.dealStage}
                />
                <DetailRow
                  icon={<User className="size-4" />}
                  label="Booked By"
                  value={meeting.bookedBy}
                />
                <DetailRow
                  icon={<User className="size-4" />}
                  label="Lead Owner"
                  value={meeting.leadOwner}
                />
                <DetailRow
                  icon={<User className="size-4" />}
                  label="Deal Owner"
                  value={meeting.dealOwner}
                />
              </div>

              <Separator />

              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Activity Timeline
              </h3>
              <div className="space-y-3">
                {[
                  { time: formatDate(meeting.bookedOn), event: "Meeting booked" },
                  ...(meeting.status === "rescheduled"
                    ? [{ time: "–", event: "Meeting rescheduled" }]
                    : []),
                  ...(meeting.status === "cancelled"
                    ? [{ time: "–", event: "Meeting cancelled" }]
                    : []),
                  ...(meeting.status === "attended" || meeting.status === "no_show"
                    ? [{ time: formatDate(meeting.meetingDate), event: meeting.status === "attended" ? "Meeting attended" : "No-show recorded" }]
                    : []),
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-sm">{item.event}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
