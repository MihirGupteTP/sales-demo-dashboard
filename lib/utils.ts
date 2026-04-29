import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, parseISO, isWithinInterval,
} from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Meeting, Deal, DateFilter, MeetingStatus, RepStats, Rep } from '@/types';

const AZ_TZ = 'America/Phoenix'; // UTC-7, no DST

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDateBounds(filter: DateFilter): { start: Date; end: Date } {
  // Compute "now" expressed in AZ local time so day/week/month boundaries are AZ-correct
  const nowAz = toZonedTime(new Date(), AZ_TZ);

  function toUtc(azLocal: Date): Date {
    return fromZonedTime(azLocal, AZ_TZ);
  }

  switch (filter.range) {
    case 'today':
      return { start: toUtc(startOfDay(nowAz)), end: toUtc(endOfDay(nowAz)) };
    case 'week':
      return {
        start: toUtc(startOfWeek(nowAz, { weekStartsOn: 0 })),
        end:   toUtc(endOfWeek(nowAz,   { weekStartsOn: 0 })),
      };
    case 'month':
      return { start: toUtc(startOfMonth(nowAz)), end: toUtc(endOfMonth(nowAz)) };
    case 'custom':
      return {
        start: filter.customStart ? toUtc(startOfDay(toZonedTime(parseISO(filter.customStart), AZ_TZ))) : toUtc(startOfMonth(nowAz)),
        end:   filter.customEnd   ? toUtc(endOfDay(toZonedTime(parseISO(filter.customEnd),   AZ_TZ))) : toUtc(endOfDay(nowAz)),
      };
  }
}

export function filterMeetings(meetings: Meeting[], filter: DateFilter): Meeting[] {
  const { start, end } = getDateBounds(filter);
  return meetings.filter((m) =>
    isWithinInterval(parseISO(m.meetingDate), { start, end })
  );
}

// Filter meetings by the date they were booked/created (bookedOn),
// not the date of the meeting itself. Used by the top-of-dashboard cards.
export function filterMeetingsByBookedOn(meetings: Meeting[], filter: DateFilter): Meeting[] {
  const { start, end } = getDateBounds(filter);
  return meetings.filter((m) =>
    isWithinInterval(parseISO(m.bookedOn), { start, end })
  );
}

// Filter deals by demo_date (primary) or createdAt (fallback when demo_date is null)
export function filterDeals(deals: Deal[], filter: DateFilter): Deal[] {
  const { start, end } = getDateBounds(filter);
  return deals.filter((d) => {
    const date = parseISO(d.demoDate ?? d.createdAt);
    return isWithinInterval(date, { start, end });
  });
}

export const STATUS_CONFIG: Record<MeetingStatus, { label: string; className: string }> = {
  booked: { label: 'Booked', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  attended: { label: 'Attended', className: 'bg-green-100 text-green-700 border-green-200' },
  no_show: { label: 'No-Show', className: 'bg-red-100 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  rescheduled: { label: 'Rescheduled', className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export function computeRepStats(meetings: Meeting[], reps: Rep[]): RepStats[] {
  const now = new Date();
  const stats: Record<string, RepStats> = {};

  for (const rep of reps) {
    stats[rep.name] = {
      rep,
      booked: 0,
      attended: 0,
      noShow: 0,
      cancelled: 0,
      rescheduled: 0,
      showRate: 0,
      upcomingCount: 0,
    };
  }

  for (const m of meetings) {
    const s = stats[m.leadOwner];
    if (!s) continue;
    if (m.status === 'booked') {
      s.booked++;
      if (parseISO(m.meetingDate) > now) s.upcomingCount++;
    } else if (m.status === 'attended') {
      s.booked++;
      s.attended++;
    } else if (m.status === 'no_show') {
      s.booked++;
      s.noShow++;
    } else if (m.status === 'cancelled') {
      s.cancelled++;
    } else if (m.status === 'rescheduled') {
      s.rescheduled++;
    }
  }

  for (const s of Object.values(stats)) {
    const completed = s.attended + s.noShow;
    s.showRate = completed > 0 ? Math.round((s.attended / completed) * 100) : 0;
  }

  return Object.values(stats).sort((a, b) => b.attended - a.attended);
}

export function formatDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), AZ_TZ, 'MMM d, yyyy h:mm a');
}

export function formatDate(iso: string): string {
  return formatInTimeZone(new Date(iso), AZ_TZ, 'MMM d, yyyy');
}

export function formatTime(iso: string): string {
  return formatInTimeZone(new Date(iso), AZ_TZ, 'h:mm a');
}

// Returns one meeting per unique contact (by email, falling back to company name).
// Used for commission calculations — 1 customer = 1 demo.
export function deduplicateMeetingsByCustomer(meetings: Meeting[]): Meeting[] {
  const byContact = new Map<string, Meeting>();
  for (const m of meetings) {
    const key = m.contactEmail ?? m.company.toLowerCase().trim();
    const existing = byContact.get(key);
    if (!existing || m.meetingDate < existing.meetingDate) {
      byContact.set(key, m);
    }
  }
  return Array.from(byContact.values());
}

// HubSpot record deep links — built from NEXT_PUBLIC_HUBSPOT_PORTAL_ID
// Object type IDs: contact=0-1, deal=0-3, meeting=0-47, lead=0-136
const HUBSPOT_OBJECT_TYPE_IDS = {
  contact: '0-1',
  deal:    '0-3',
  meeting: '0-47',
  lead:    '0-136',
} as const;

export function hubspotRecordUrl(
  type: keyof typeof HUBSPOT_OBJECT_TYPE_IDS,
  id: string | undefined | null,
): string | null {
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID;
  if (!portalId || !id) return null;
  return `https://app.hubspot.com/contacts/${portalId}/record/${HUBSPOT_OBJECT_TYPE_IDS[type]}/${id}`;
}

// Returns average days between bookedOn and meetingDate, or null if no data.
export function computeAvgTimeToDemo(meetings: Meeting[]): number | null {
  const diffs: number[] = [];
  for (const m of meetings) {
    const diffMs = parseISO(m.meetingDate).getTime() - parseISO(m.bookedOn).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 0) diffs.push(diffDays);
  }
  if (diffs.length === 0) return null;
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}
