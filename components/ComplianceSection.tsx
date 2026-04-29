"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMeetings } from "@/lib/hooks/use-meetings";
import { useTimeFilter } from "./TimeFilterContext";
import { filterMeetings, formatDateTime } from "@/lib/utils";
import { ComplianceIssue, ComplianceIssueType } from "@/types";
import { ChevronDown, ChevronRight, FileWarning, AlertCircle, UserX, Users, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionDef {
  key: ComplianceIssueType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  issues: ComplianceIssue[];
}

export function ComplianceSection() {
  const { filter, repFilter } = useTimeFilter();
  const { meetings: allMeetings, compliance } = useMeetings();
  const [expanded, setExpanded] = useState(false);
  const [openSection, setOpenSection] = useState<ComplianceIssueType | null>(null);

  // Filter compliance issues by time range and rep
  const filtered = useMemo(() => {
    const inRange = new Set(filterMeetings(allMeetings, filter).map((m) => m.id));
    const repSet = new Set(repFilter);
    const repMatch = (ownerName: string) => repSet.size === 0 || repSet.has(ownerName);
    const keep = (c: ComplianceIssue) => inRange.has(c.meetingId) && repMatch(c.ownerName);
    return {
      noDeal: compliance.noDeal.filter(keep),
      blankDemoStatus: compliance.blankDemoStatus.filter(keep),
      noContact: compliance.noContact.filter(keep),
      noLead: compliance.noLead.filter(keep),
    };
  }, [allMeetings, compliance, filter, repFilter]);

  const total = filtered.noDeal.length + filtered.blankDemoStatus.length + filtered.noContact.length + filtered.noLead.length;

  if (total === 0) return null;

  const allSections: SectionDef[] = [
    {
      key: "no_deal" as const,
      label: "Meetings without deal",
      icon: <FileWarning className="size-3.5" />,
      color: "text-amber-700",
      bgColor: "bg-amber-50 border-amber-200",
      issues: filtered.noDeal,
    },
    {
      key: "blank_demo_status" as const,
      label: "Blank demo status",
      icon: <AlertCircle className="size-3.5" />,
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      issues: filtered.blankDemoStatus,
    },
    {
      key: "no_contact" as const,
      label: "Missing contact",
      icon: <UserX className="size-3.5" />,
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
      issues: filtered.noContact,
    },
    {
      key: "no_lead" as const,
      label: "Missing lead",
      icon: <Users className="size-3.5" />,
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
      issues: filtered.noLead,
    },
  ];
  const sections = allSections.filter((s) => s.issues.length > 0);

  return (
    <Card className="border-amber-200/50">
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-600" />
            <CardTitle className="text-sm">
              Data Compliance
              <span className="ml-2 text-muted-foreground font-normal">
                {total} issue{total !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Summary badges */}
            {sections.map((s) => (
              <span key={s.key} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border", s.bgColor, s.color)}>
                {s.icon}
                {s.issues.length}
              </span>
            ))}
            {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
              <div key={section.key} className={cn("rounded-lg border", section.bgColor)}>
                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                  onClick={() => setOpenSection(openSection === section.key ? null : section.key)}
                >
                  <div className={cn("flex items-center gap-2 text-sm font-medium", section.color)}>
                    {section.icon}
                    {section.label}
                    <span className="text-xs font-normal">({section.issues.length})</span>
                  </div>
                  {openSection === section.key
                    ? <ChevronDown className="size-3.5 text-muted-foreground" />
                    : <ChevronRight className="size-3.5 text-muted-foreground" />}
                </button>

                {openSection === section.key && (
                  <div className="px-3 pb-3">
                    <div className="rounded-md border border-border bg-background overflow-hidden">
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-1.5 border-b bg-muted/50 text-[11px] font-medium text-muted-foreground">
                        <span>Meeting</span>
                        <span>Date</span>
                        <span>{section.key === "no_deal" ? "Booked By" : "Deal"}</span>
                        <span>Rep</span>
                      </div>
                      <div className="divide-y divide-border max-h-48 overflow-y-auto">
                        {section.issues.map((issue) => (
                          <div key={`${issue.meetingId}-${issue.type}`} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2 text-xs">
                            <span className="truncate font-medium">{issue.meetingName}</span>
                            <span className="text-muted-foreground">{formatDateTime(issue.meetingDate)}</span>
                            <span className="truncate text-muted-foreground">
                              {section.key === "no_deal" ? issue.ownerName : (issue.dealName || "—")}
                            </span>
                            <span className="truncate text-muted-foreground">{issue.ownerName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
