import { Meeting, Rep, MeetingStatus } from '@/types';
import { addDays } from 'date-fns';

const BASE = 'https://api.hubapi.com';
const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

// Only consider meetings booked on or after this date
const DATE_FROM = new Date('2026-02-01T00:00:00.000Z').getTime();

const SALES_TEAM_PREFIXES = ['Sales - SME', 'Sales - OO', 'Sales Managers'];

function hubspotHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

interface HubSpotOwner {
  id: string;
  userId?: number;
  firstName?: string;
  lastName?: string;
  email: string;
  teams?: { id: string; name: string }[];
}

function isSalesOwner(o: HubSpotOwner): boolean {
  return (o.teams ?? []).some((t) =>
    SALES_TEAM_PREFIXES.some((prefix) => t.name.startsWith(prefix))
  );
}

function ownerToRep(o: HubSpotOwner): Rep {
  const teams = (o.teams ?? []).map((t) => t.name);
  const team: Rep['team'] =
    teams.some((t) => t.startsWith('Sales - SME')) ? 'SME' :
    teams.some((t) => t.startsWith('Sales - OO'))  ? 'OO'  :
    'Manager';
  return {
    id: o.id,
    name: [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email,
    initials: [o.firstName?.[0], o.lastName?.[0]].filter(Boolean).join('').toUpperCase()
      || o.email.slice(0, 2).toUpperCase(),
    team,
  };
}

async function fetchAllOwners(): Promise<HubSpotOwner[]> {
  const res = await fetch(`${BASE}/crm/v3/owners?limit=100`, {
    headers: hubspotHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`HubSpot owners: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.results as HubSpotOwner[];
}

// For /api/reps — only sales team members
export async function fetchHubSpotOwners(): Promise<Rep[]> {
  const all = await fetchAllOwners();
  return all.filter(isSalesOwner).map(ownerToRep);
}

// For zoom.ts enrichment — map host email → rep name
export async function fetchOwnerEmailToNameMap(): Promise<Map<string, string>> {
  const all = await fetchAllOwners();
  const map = new Map<string, string>();
  for (const o of all) {
    const name = [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email;
    if (o.email) map.set(o.email.toLowerCase(), name);
  }
  return map;
}

// ────────────────────────────────────────────────────────────────────────────
// Meetings
// ────────────────────────────────────────────────────────────────────────────

interface HubSpotMeeting {
  id: string;
  properties: {
    hs_meeting_title?: string;
    hs_meeting_start_time?: string;
    hs_createdate?: string;
    hs_meeting_outcome?: string;
    hs_video_conference_url?: string;   // ← correct field (not hs_meeting_external_url)
    hubspot_owner_id?: string;
    hs_attendee_owner_ids?: string;
  };
}

// HubSpot date fields come back as millisecond-epoch strings or ISO strings
function parseHubSpotDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  // Try as ms epoch first (HubSpot timestamps)
  const asMs = Number(raw);
  if (!isNaN(asMs) && asMs > 1_000_000_000_000) {
    return new Date(asMs).toISOString();
  }
  // Fall back to ISO string parse
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// HubSpot uses CANCELED (one L); our type uses 'cancelled'
const OUTCOME_MAP: Record<string, MeetingStatus> = {
  SCHEDULED:   'booked',
  COMPLETED:   'attended',
  NO_SHOW:     'no_show',
  CANCELLED:   'cancelled',
  CANCELED:    'cancelled',
  RESCHEDULED: 'rescheduled',
};

// Extract prospect / company name from HubSpot meeting title
// Handles patterns like "John Smith <> Trucker Path Demo" and "Demo: Acme Corp <> Trucker Path"
function extractProspectName(title: string): string {
  const beforeArrow = title.split('<>')[0];
  return beforeArrow
    .replace(/^(Demo:|Meeting:|Follow-up Demo:|Update:|Canceled:|Cancelled:)\s*/i, '')
    .trim() || title;
}

export async function fetchHubSpotMeetings(): Promise<Meeting[]> {
  if (!TOKEN) throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is not set');

  // Get all owners to build maps and derive sales rep filter IDs
  const allOwners = await fetchAllOwners();
  const ownerIdToName = new Map(
    allOwners.map((o) => [
      o.id,
      [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email,
    ])
  );
  const salesOwnerIds = allOwners.filter(isSalesOwner).map((o) => o.id);

  const dateTo = addDays(new Date(), 14).getTime();

  const rawMeetings: HubSpotMeeting[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            // Date window: Feb 1 2026 → 14 days ahead
            { propertyName: 'hs_meeting_start_time', operator: 'GTE', value: String(DATE_FROM) },
            { propertyName: 'hs_meeting_start_time', operator: 'LTE', value: String(dateTo) },
            // Demo meetings only
            { propertyName: 'hs_activity_type', operator: 'EQ', value: 'Demo' },
            // Zoom meetings only
            { propertyName: 'hs_video_conference_url', operator: 'HAS_PROPERTY' },
            // Sales reps only
            { propertyName: 'hubspot_owner_id', operator: 'IN', values: salesOwnerIds },
          ],
        },
      ],
      properties: [
        'hs_meeting_title',
        'hs_meeting_start_time',
        'hs_createdate',
        'hs_meeting_outcome',
        'hs_video_conference_url',
        'hs_activity_type',
        'hubspot_owner_id',
        'hs_attendee_owner_ids',
      ],
      limit: 100,
    };
    if (after) body.after = after;

    const res = await fetch(`${BASE}/crm/v3/objects/meetings/search`, {
      method: 'POST',
      headers: hubspotHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HubSpot meetings: ${res.status} ${await res.text()}`);
    const data = await res.json();
    rawMeetings.push(...(data.results ?? []));
    after = data.paging?.next?.after;
  } while (after);

  return rawMeetings.map((m): Meeting => {
    const p = m.properties;
    const ownerId = p.hubspot_owner_id ?? '';
    const hubspotOutcome = (p.hs_meeting_outcome ?? '').toUpperCase();
    const status: MeetingStatus = OUTCOME_MAP[hubspotOutcome] ?? 'booked';
    const prospectName = extractProspectName(p.hs_meeting_title ?? '');

    return {
      id: m.id,
      name: p.hs_meeting_title ?? prospectName,
      company: prospectName,
      bookedOn: parseHubSpotDate(p.hs_createdate),
      meetingDate: parseHubSpotDate(p.hs_meeting_start_time),
      status,
      leadStatus: '',    // no contact associations in HubSpot for these meetings
      dealStage: '',     // no deal associations in HubSpot for these meetings
      // bookedBy will be overwritten by Zoom host_email in enrichWithZoomData
      bookedBy: ownerIdToName.get(ownerId) ?? 'Unassigned',
      leadOwner: ownerIdToName.get(ownerId) ?? 'Unassigned',
      dealOwner: ownerIdToName.get(ownerId) ?? 'Unassigned',
      zoomMeetingUrl: p.hs_video_conference_url,
    };
  });
}
