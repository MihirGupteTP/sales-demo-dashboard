export type MeetingStatus = 'booked' | 'attended' | 'no_show' | 'cancelled' | 'rescheduled';

export interface Meeting {
  id: string;
  name: string;
  company: string;
  bookedOn: string; // ISO date string
  meetingDate: string; // ISO date string
  status: MeetingStatus;
  leadStatus: string;
  dealStage: string;
  leadOwner: string;
  dealOwner: string;
  notes?: string;
  zoomMeetingUrl?: string;
}

export interface Rep {
  id: string;
  name: string;
  initials: string;
}

export type TimeRange = 'today' | 'week' | 'month' | 'custom';

export interface DateFilter {
  range: TimeRange;
  customStart?: string;
  customEnd?: string;
}

export interface RepStats {
  rep: Rep;
  booked: number;
  attended: number;
  noShow: number;
  cancelled: number;
  rescheduled: number;
  showRate: number;
  upcomingCount: number;
}
