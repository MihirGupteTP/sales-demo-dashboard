import { Meeting, Rep, MeetingStatus } from '@/types';
import { subDays, addDays } from 'date-fns';

const BASE = 'https://api.hubapi.com';
const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

function hubspotHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Owners (HubSpot users / reps)
// ────────────────────────────────────────────────────────────────────────────

interface HubSpotOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function fetchHubSpotOwners(): Promise<Rep[]> {
  const res = await fetch(`${BASE}/crm/v3/owners?limit=100`, {
    headers: hubspotHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`HubSpot owners: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.results as HubSpotOwner[]).map((o) => ({
    id: o.id,
    name: [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email,
    initials: [o.firstName?.[0], o.lastName?.[0]].filter(Boolean).join('').toUpperCase() || o.email.slice(0, 2).toUpperCase(),
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Meetings (paginated search with associations)
// ────────────────────────────────────────────────────────────────────────────

interface HubSpotMeeting {
  id: string;
  properties: {
    hs_meeting_title?: string;
    hs_meeting_start_time?: string;
    hs_createdate?: string;
    hs_meeting_outcome?: string;
    hs_meeting_external_url?: string;
    hs_meeting_body?: string;
    hubspot_owner_id?: string; // the rep who owns / booked the meeting
  };
  associations?: {
    contacts?: { results: { id: string }[] };
    deals?: { results: { id: string }[] };
  };
}

interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    company?: string;
    hubspot_owner_id?: string;
    lifecyclestage?: string;
  };
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    dealstage?: string;
    hubspot_owner_id?: string;
  };
}

const OUTCOME_MAP: Record<string, MeetingStatus> = {
  SCHEDULED: 'booked',
  COMPLETED: 'attended',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
};

async function batchFetchContacts(ids: string[]): Promise<Map<string, HubSpotContact>> {
  if (ids.length === 0) return new Map();
  const res = await fetch(`${BASE}/crm/v3/objects/contacts/batch/read`, {
    method: 'POST',
    headers: hubspotHeaders(),
    body: JSON.stringify({
      inputs: ids.map((id) => ({ id })),
      properties: ['firstname', 'lastname', 'company', 'hubspot_owner_id', 'lifecyclestage'],
    }),
  });
  if (!res.ok) return new Map();
  const data = await res.json();
  const map = new Map<string, HubSpotContact>();
  for (const c of data.results ?? []) map.set(c.id, c);
  return map;
}

async function batchFetchDeals(ids: string[]): Promise<Map<string, HubSpotDeal>> {
  if (ids.length === 0) return new Map();
  const res = await fetch(`${BASE}/crm/v3/objects/deals/batch/read`, {
    method: 'POST',
    headers: hubspotHeaders(),
    body: JSON.stringify({
      inputs: ids.map((id) => ({ id })),
      properties: ['dealname', 'dealstage', 'hubspot_owner_id'],
    }),
  });
  if (!res.ok) return new Map();
  const data = await res.json();
  const map = new Map<string, HubSpotDeal>();
  for (const d of data.results ?? []) map.set(d.id, d);
  return map;
}

export async function fetchHubSpotMeetings(): Promise<Meeting[]> {
  if (!TOKEN) throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is not set');

  const dateFrom = subDays(new Date(), 90).getTime();
  const dateTo = addDays(new Date(), 14).getTime();

  // Paginate through all meetings in the window
  const rawMeetings: HubSpotMeeting[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            { propertyName: 'hs_meeting_start_time', operator: 'GTE', value: String(dateFrom) },
            { propertyName: 'hs_meeting_start_time', operator: 'LTE', value: String(dateTo) },
          ],
        },
      ],
      properties: [
        'hs_meeting_title',
        'hs_meeting_start_time',
        'hs_createdate',
        'hs_meeting_outcome',
        'hs_meeting_external_url',
        'hs_meeting_body',
        'hubspot_owner_id',
      ],
      associations: ['contacts', 'deals'],
      limit: 100,
    };
    if (after) body.after = after;

    const res = await fetch(`${BASE}/crm/v3/objects/meetings/search`, {
      method: 'POST',
      headers: hubspotHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HubSpot meetings search: ${res.status} ${await res.text()}`);
    const data = await res.json();
    rawMeetings.push(...(data.results ?? []));
    after = data.paging?.next?.after;
  } while (after);

  // Collect unique contact + deal IDs
  const contactIds = new Set<string>();
  const dealIds = new Set<string>();
  for (const m of rawMeetings) {
    for (const c of m.associations?.contacts?.results ?? []) contactIds.add(c.id);
    for (const d of m.associations?.deals?.results ?? []) dealIds.add(d.id);
  }

  // Batch fetch contacts, deals, and owners in parallel
  const [contacts, deals, owners] = await Promise.all([
    batchFetchContacts([...contactIds]),
    batchFetchDeals([...dealIds]),
    fetchHubSpotOwners(),
  ]);

  const ownerMap = new Map<string, string>(owners.map((o) => [o.id, o.name]));

  // Normalize
  const meetings: Meeting[] = rawMeetings.map((m) => {
    const p = m.properties;
    const contactId = m.associations?.contacts?.results?.[0]?.id;
    const dealId = m.associations?.deals?.results?.[0]?.id;
    const contact = contactId ? contacts.get(contactId) : undefined;
    const deal = dealId ? deals.get(dealId) : undefined;

    const contactName = contact
      ? [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') || 'Unknown Contact'
      : 'Unknown Contact';
    const company = contact?.properties.company ?? '';
    const bookedByOwnerId = p.hubspot_owner_id; // meeting's own owner = who booked it
    const leadOwnerId = contact?.properties.hubspot_owner_id;
    const dealOwnerId = deal?.properties.hubspot_owner_id;
    const leadStatus = contact?.properties.lifecyclestage ?? '';
    const dealStage = deal?.properties.dealstage ?? '';

    const hubspotOutcome = (p.hs_meeting_outcome ?? '').toUpperCase();
    const status: MeetingStatus = OUTCOME_MAP[hubspotOutcome] ?? 'booked';

    return {
      id: m.id,
      name: p.hs_meeting_title ?? `Meeting with ${contactName}`,
      company,
      bookedOn: p.hs_createdate ?? new Date().toISOString(),
      meetingDate: p.hs_meeting_start_time
        ? new Date(Number(p.hs_meeting_start_time)).toISOString()
        : new Date().toISOString(),
      status,
      leadStatus,
      dealStage,
      bookedBy: ownerMap.get(bookedByOwnerId ?? '') ?? ownerMap.get(leadOwnerId ?? '') ?? 'Unassigned',
      leadOwner: ownerMap.get(leadOwnerId ?? '') ?? contactName,
      dealOwner: ownerMap.get(dealOwnerId ?? '') ?? ownerMap.get(leadOwnerId ?? '') ?? 'Unassigned',
      notes: p.hs_meeting_body,
      zoomMeetingUrl: p.hs_meeting_external_url,
    } as Meeting & { zoomMeetingUrl?: string };
  });

  return meetings;
}
