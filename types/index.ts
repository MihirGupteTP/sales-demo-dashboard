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
  bookedBy: string;
  leadOwner: string;
  dealOwner: string;
  notes?: string;
  zoomMeetingUrl?: string;
  needsTypeSet?: boolean;  // true when matched by title but hs_activity_type is blank
}

export type SalesTeam = 'SME' | 'OO' | 'Manager';

export interface Rep {
  id: string;
  name: string;
  initials: string;
  team: SalesTeam;
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
