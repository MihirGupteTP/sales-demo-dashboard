import { MeetingStatus } from "@/types";
import { STATUS_CONFIG } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}
