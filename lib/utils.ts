import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, parseISO, isWithinInterval,
  format
} from 'date-fns';
import { Meeting, DateFilter, MeetingStatus, RepStats, Rep } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDateBounds(filter: DateFilter): { start: Date; end: Date } {
  const now = new Date();
  switch (filter.range) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'custom':
      return {
        start: filter.customStart ? startOfDay(parseISO(filter.customStart)) : startOfMonth(now),
        end: filter.customEnd ? endOfDay(parseISO(filter.customEnd)) : endOfDay(now),
      };
  }
}

export function filterMeetings(meetings: Meeting[], filter: DateFilter): Meeting[] {
  const { start, end } = getDateBounds(filter);
  return meetings.filter((m) =>
    isWithinInterval(parseISO(m.meetingDate), { start, end })
  );
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
  return format(parseISO(iso), 'MMM d, yyyy h:mm a');
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy');
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'h:mm a');
}
