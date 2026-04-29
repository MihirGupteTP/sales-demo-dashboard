export type MeetingStatus = 'booked' | 'attended' | 'no_show' | 'cancelled' | 'rescheduled';

export type DemoStatus = 'scheduled' | 'completed' | 'no_show' | 'not_needed' | 'unset';

// Identifies which of the 4 top-of-dashboard cards the user clicked.
// These are derived views (not raw statuses), hence a dedicated type.
export type CardType = 'booked' | 'upcoming' | 'attended' | 'no_show';

export interface Deal {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  demoStatus: DemoStatus;
  demoDate: string | null;      // ISO string from demo_date field, null if blank
  createdAt: string;            // ISO string from createdate
  closedWonAt: string | null;   // ISO string from hs_v2_date_entered_closedwon
  amount: number;               // deal amount in USD
}

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
  contactEmail?: string;   // primary contact email from HubSpot association
  needsTypeSet?: boolean;  // true when matched by title but hs_activity_type is blank
  // Deal enrichment fields
  dealId?: string;           // associated deal ID, undefined = no deal
  contactId?: string;        // primary contact ID (for HubSpot deep link)
  leadId?: string;           // associated Lead object ID (for HubSpot deep link)
  demoStatus?: DemoStatus;   // from deal's demo_done property
  hasContact?: boolean;      // deal has contact associated
  hasLead?: boolean;         // deal has lead associated (new Leads object)
}

export type SalesTeam = 'SME AE' | 'SME SDR';

export interface Rep {
  id: string;
  name: string;
  initials: string;
  team: SalesTeam;
}

export type ComplianceIssueType = 'no_deal' | 'blank_demo_status' | 'no_contact' | 'no_lead';

export interface ComplianceIssue {
  type: ComplianceIssueType;
  meetingId: string;
  meetingName: string;
  meetingDate: string;
  dealId?: string;
  dealName?: string;
  contactId?: string;
  ownerName: string;
}

export interface ComplianceSummary {
  noDeal: ComplianceIssue[];
  blankDemoStatus: ComplianceIssue[];
  noContact: ComplianceIssue[];
  noLead: ComplianceIssue[];
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
