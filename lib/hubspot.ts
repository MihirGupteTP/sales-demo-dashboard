import { Meeting, Rep, Deal, DemoStatus, MeetingStatus, ComplianceSummary, ComplianceIssue } from '@/types';
import { addDays } from 'date-fns';

const BASE = 'https://api.hubapi.com';
const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

// Only consider meetings booked on or after this date
const DATE_FROM = new Date('2026-02-01T00:00:00.000Z').getTime();

const SALES_TEAM_NAMES = new Set(['Sales - SME - AE', 'Sales - SME - SDR']);

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
  return (o.teams ?? []).some((t) => SALES_TEAM_NAMES.has(t.name));
}

function ownerToRep(o: HubSpotOwner): Rep {
  const teams = (o.teams ?? []).map((t) => t.name);
  // Use the first SME sub-team listed in HubSpot (order reflects primary role)
  let team: Rep['team'] = 'SME SDR';
  for (const t of teams) {
    if (t === 'Sales - SME - AE')  { team = 'SME AE';  break; }
    if (t === 'Sales - SME - SDR') { team = 'SME SDR'; break; }
  }
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
    hs_video_conference_url?: string;
    hs_activity_type?: string;
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

  const dateTo = addDays(new Date(), 90).getTime();

  const rawMeetings: HubSpotMeeting[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            // Date window: Feb 1 2026 → 90 days ahead
            { propertyName: 'hs_meeting_start_time', operator: 'GTE', value: String(DATE_FROM) },
            { propertyName: 'hs_meeting_start_time', operator: 'LTE', value: String(dateTo) },
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

  // Fetch contact associations for all meetings → get primary contact email, lead status, lead owner
  const meetingIdToContactEmail = new Map<string, string>();
  const meetingIdToLeadStatus = new Map<string, string>();
  const meetingIdToLeadOwnerId = new Map<string, string>();
  const meetingIds = rawMeetings.map((m) => m.id);

  // Batch in groups of 100 (HubSpot limit)
  for (let i = 0; i < meetingIds.length; i += 100) {
    const chunk = meetingIds.slice(i, i + 100);
    try {
      const assocRes = await fetch(`${BASE}/crm/v4/associations/meetings/contacts/batch/read`, {
        method: 'POST',
        headers: hubspotHeaders(),
        body: JSON.stringify({ inputs: chunk.map((id) => ({ id })) }),
      });
      if (assocRes.ok) {
        const assocData = await assocRes.json();
        // Collect unique contact IDs and track which meeting they belong to
        const meetingToContactIds = new Map<string, string[]>();
        for (const result of assocData.results ?? []) {
          const contactIds = (result.to ?? []).map((t: { toObjectId: string }) => t.toObjectId);
          if (contactIds.length > 0) meetingToContactIds.set(result.from.id, contactIds);
        }

        // Batch read contact properties
        const allContactIds = [...new Set([...meetingToContactIds.values()].flat())];
        if (allContactIds.length > 0) {
          const contactRes = await fetch(`${BASE}/crm/v3/objects/contacts/batch/read`, {
            method: 'POST',
            headers: hubspotHeaders(),
            body: JSON.stringify({
              inputs: allContactIds.map((id) => ({ id })),
              properties: ['email', 'hs_lead_status', 'hubspot_owner_id'],
            }),
          });
          if (contactRes.ok) {
            const contactData = await contactRes.json();
            const contactIdToInfo = new Map<string, { email?: string; leadStatus?: string; ownerId?: string }>();
            for (const c of contactData.results ?? []) {
              const props = c.properties ?? {};
              contactIdToInfo.set(c.id, {
                email: props.email ? String(props.email).toLowerCase() : undefined,
                leadStatus: props.hs_lead_status || undefined,
                ownerId: props.hubspot_owner_id || undefined,
              });
            }
            // Map meeting → first contact with usable info
            for (const [meetingId, contactIds] of meetingToContactIds) {
              for (const cId of contactIds) {
                const info = contactIdToInfo.get(cId);
                if (!info) continue;
                if (info.email && !meetingIdToContactEmail.has(meetingId)) {
                  meetingIdToContactEmail.set(meetingId, info.email);
                }
                if (info.leadStatus && !meetingIdToLeadStatus.has(meetingId)) {
                  meetingIdToLeadStatus.set(meetingId, info.leadStatus);
                }
                if (info.ownerId && !meetingIdToLeadOwnerId.has(meetingId)) {
                  meetingIdToLeadOwnerId.set(meetingId, info.ownerId);
                }
                if (meetingIdToContactEmail.has(meetingId) && meetingIdToLeadStatus.has(meetingId) && meetingIdToLeadOwnerId.has(meetingId)) break;
              }
            }
          }
        }
      }
    } catch {
      // Best-effort — if associations fail, deduplication falls back to company name
    }
  }

  const normalized: Meeting[] = [];

  for (const m of rawMeetings) {
    const p = m.properties;
    const activityType = p.hs_activity_type ?? '';
    const title = p.hs_meeting_title ?? '';

    // Only explicitly-typed Demo meetings count. Blank-type was sweeping in
    // onboarding / internal / portal-config meetings and inflating the booked
    // count. Reps must set the type for a meeting to appear on the dashboard.
    if (activityType !== 'Demo') continue;

    const ownerId = p.hubspot_owner_id ?? '';
    const hubspotOutcome = (p.hs_meeting_outcome ?? '').toUpperCase();
    const status: MeetingStatus = OUTCOME_MAP[hubspotOutcome] ?? 'booked';
    const prospectName = extractProspectName(title);

    normalized.push({
      id: m.id,
      name: title || prospectName,
      company: prospectName,
      bookedOn: parseHubSpotDate(p.hs_createdate),
      meetingDate: parseHubSpotDate(p.hs_meeting_start_time),
      status,
      leadStatus: meetingIdToLeadStatus.get(m.id) ?? '',
      dealStage: '',
      bookedBy: ownerIdToName.get(ownerId) ?? 'Unassigned',
      leadOwner: ownerIdToName.get(meetingIdToLeadOwnerId.get(m.id) ?? '') ?? 'Unassigned',
      dealOwner: 'Unassigned',
      zoomMeetingUrl: p.hs_video_conference_url,
      contactEmail: meetingIdToContactEmail.get(m.id),
      needsTypeSet: false,
    });
  }

  return normalized;
}

// ────────────────────────────────────────────────────────────────────────────
// Deals — KPI cards use demo_done (Demo Status) from deals
// ────────────────────────────────────────────────────────────────────────────

const DEMO_STATUS_MAP: Record<string, DemoStatus> = {
  'No':         'scheduled',
  'Yes':        'completed',
  'No-Show':    'no_show',
  'Not Needed': 'not_needed',
};

export async function fetchHubSpotDeals(): Promise<Deal[]> {
  if (!TOKEN) throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is not set');

  const allOwners = await fetchAllOwners();
  const salesOwners = allOwners.filter(isSalesOwner);
  const ownerIdToName = new Map(
    salesOwners.map((o) => [
      o.id,
      [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email,
    ])
  );
  const salesOwnerIds = salesOwners.map((o) => o.id);

  const rawDeals: { id: string; properties: Record<string, string | undefined> }[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [{
        filters: [
          { propertyName: 'hubspot_owner_id', operator: 'IN', values: salesOwnerIds },
          { propertyName: 'createdate', operator: 'GTE', value: String(DATE_FROM) },
          { propertyName: 'pipeline', operator: 'EQ', value: 'default' },
        ],
      }],
      properties: ['dealname', 'demo_done', 'demo_date', 'hubspot_owner_id', 'createdate', 'hs_v2_date_entered_closedwon', 'amount'],
      limit: 100,
    };
    if (after) body.after = after;

    const res = await fetch(`${BASE}/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: hubspotHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HubSpot deals: ${res.status} ${await res.text()}`);
    const data = await res.json();
    rawDeals.push(...(data.results ?? []));
    after = data.paging?.next?.after;
  } while (after);

  return rawDeals.map((d) => {
    const p = d.properties;
    const demoDoneRaw = p.demo_done ?? '';
    return {
      id: d.id,
      name: p.dealname ?? '',
      ownerId: p.hubspot_owner_id ?? '',
      ownerName: ownerIdToName.get(p.hubspot_owner_id ?? '') ?? 'Unassigned',
      demoStatus: DEMO_STATUS_MAP[demoDoneRaw] ?? 'unset',
      demoDate: p.demo_date ? parseHubSpotDate(p.demo_date) : null,
      createdAt: parseHubSpotDate(p.createdate),
      closedWonAt: p.hs_v2_date_entered_closedwon ? parseHubSpotDate(p.hs_v2_date_entered_closedwon) : null,
      amount: parseFloat(p.amount ?? '0') || 0,
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Deal enrichment for meetings — links meetings → deals → contacts/leads
// ────────────────────────────────────────────────────────────────────────────

async function fetchDealStageLabels(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`${BASE}/crm/v3/pipelines/deals`, {
      headers: hubspotHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return map;
    const data = await res.json();
    for (const pipeline of data.results ?? []) {
      for (const stage of pipeline.stages ?? []) {
        if (stage.id && stage.label) map.set(stage.id, stage.label);
      }
    }
  } catch {
    // Best-effort — empty map means we fall back to raw stage IDs
  }
  return map;
}

async function batchAssociationRead(
  fromType: string,
  toType: string,
  ids: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await fetch(`${BASE}/crm/v4/associations/${fromType}/${toType}/batch/read`, {
      method: 'POST',
      headers: hubspotHeaders(),
      body: JSON.stringify({ inputs: chunk.map((id) => ({ id })) }),
    });
    if (!res.ok) continue;
    const data = await res.json();
    for (const result of data.results ?? []) {
      const toIds = (result.to ?? []).map((t: { toObjectId: string | number }) => String(t.toObjectId));
      if (toIds.length > 0) map.set(result.from.id, toIds);
    }
  }
  return map;
}

export async function enrichMeetingsWithDealData(
  meetings: Meeting[],
): Promise<{ meetings: Meeting[]; compliance: ComplianceSummary }> {
  const compliance: ComplianceSummary = {
    noDeal: [],
    blankDemoStatus: [],
    noContact: [],
    noLead: [],
  };

  if (!TOKEN || meetings.length === 0) return { meetings, compliance };

  // Meetings and deals are NOT directly associated in HubSpot.
  // Join path: meeting → contact → deal (via shared contact).

  const [allOwners, stageLabels] = await Promise.all([
    fetchAllOwners(),
    fetchDealStageLabels(),
  ]);
  const ownerIdToName = new Map(
    allOwners.map((o) => [
      o.id,
      [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email,
    ])
  );

  // Step 1: Get meeting → contact associations (contact IDs)
  const meetingIds = meetings.map((m) => m.id);
  const meetingToContactIds = await batchAssociationRead('meetings', 'contacts', meetingIds);

  // Step 2: Get contact → deal associations for all contacts
  const allContactIds = [...new Set([...meetingToContactIds.values()].flat())];
  const contactToDealIds = allContactIds.length > 0
    ? await batchAssociationRead('contacts', 'deals', allContactIds)
    : new Map<string, string[]>();

  // Step 3: Batch-read deal properties
  const allDealIds = [...new Set([...contactToDealIds.values()].flat())];
  const dealMap = new Map<string, { name: string; demoDone: string; pipeline: string; stageId: string; ownerId: string }>();

  for (let i = 0; i < allDealIds.length; i += 100) {
    const chunk = allDealIds.slice(i, i + 100);
    const res = await fetch(`${BASE}/crm/v3/objects/deals/batch/read`, {
      method: 'POST',
      headers: hubspotHeaders(),
      body: JSON.stringify({
        inputs: chunk.map((id) => ({ id })),
        properties: ['dealname', 'demo_done', 'pipeline', 'dealstage', 'hubspot_owner_id'],
      }),
    });
    if (!res.ok) continue;
    const data = await res.json();
    for (const d of data.results ?? []) {
      dealMap.set(d.id, {
        name: d.properties.dealname ?? '',
        demoDone: d.properties.demo_done ?? '',
        pipeline: d.properties.pipeline ?? '',
        stageId: d.properties.dealstage ?? '',
        ownerId: d.properties.hubspot_owner_id ?? '',
      });
    }
  }

  // Build contact → default-pipeline deal lookup
  // A contact may have multiple deals; pick the one in the default pipeline
  const contactToDeal = new Map<string, { dealId: string; name: string; demoDone: string; stageId: string; ownerId: string }>();
  for (const [contactId, dealIds] of contactToDealIds) {
    for (const dId of dealIds) {
      const deal = dealMap.get(dId);
      if (deal && deal.pipeline === 'default') {
        contactToDeal.set(contactId, {
          dealId: dId,
          name: deal.name,
          demoDone: deal.demoDone,
          stageId: deal.stageId,
          ownerId: deal.ownerId,
        });
        break;
      }
    }
  }

  // Step 4: Check deal → contact and deal → lead associations (compliance)
  const defaultDealIds = [...new Set([...contactToDeal.values()].map((d) => d.dealId))];
  let dealsWithContact = new Set<string>();
  let dealsWithLead = new Set<string>();

  if (defaultDealIds.length > 0) {
    const [contactAssoc, leadAssoc] = await Promise.all([
      batchAssociationRead('deals', 'contacts', defaultDealIds),
      batchAssociationRead('deals', 'leads', defaultDealIds).catch(() => new Map<string, string[]>()),
    ]);
    dealsWithContact = new Set(contactAssoc.keys());
    dealsWithLead = new Set(leadAssoc.keys());
  }

  // Step 5: Merge onto meetings + build compliance
  const enriched = meetings.map((m) => {
    // Find the deal via meeting → contact → deal chain
    const contactIds = meetingToContactIds.get(m.id);
    let matchedDealId: string | undefined;
    let matchedDeal: { name: string; demoDone: string; stageId: string; ownerId: string } | undefined;

    if (contactIds) {
      for (const cId of contactIds) {
        const deal = contactToDeal.get(cId);
        if (deal) {
          matchedDealId = deal.dealId;
          matchedDeal = deal;
          break;
        }
      }
    }

    const base: ComplianceIssue = {
      type: 'no_deal',
      meetingId: m.id,
      meetingName: m.name,
      meetingDate: m.meetingDate,
      ownerName: m.bookedBy,
    };

    if (!matchedDealId || !matchedDeal) {
      compliance.noDeal.push({ ...base, type: 'no_deal' });
      return m;
    }

    const demoStatus = DEMO_STATUS_MAP[matchedDeal.demoDone] as DemoStatus | undefined;
    const hasContact = dealsWithContact.has(matchedDealId);
    const hasLead = dealsWithLead.has(matchedDealId);

    if (!matchedDeal.demoDone) {
      compliance.blankDemoStatus.push({
        ...base,
        type: 'blank_demo_status',
        dealId: matchedDealId,
        dealName: matchedDeal.name,
      });
    }
    if (!hasContact) {
      compliance.noContact.push({
        ...base,
        type: 'no_contact',
        dealId: matchedDealId,
        dealName: matchedDeal.name,
      });
    }
    if (!hasLead) {
      compliance.noLead.push({
        ...base,
        type: 'no_lead',
        dealId: matchedDealId,
        dealName: matchedDeal.name,
      });
    }

    const dealStageLabel = matchedDeal.stageId
      ? (stageLabels.get(matchedDeal.stageId) ?? matchedDeal.stageId)
      : '';
    const dealOwnerName = matchedDeal.ownerId
      ? (ownerIdToName.get(matchedDeal.ownerId) ?? 'Unassigned')
      : 'Unassigned';

    return {
      ...m,
      dealId: matchedDealId,
      demoStatus,
      hasContact,
      hasLead,
      dealStage: dealStageLabel,
      dealOwner: dealOwnerName,
    };
  });

  return { meetings: enriched, compliance };
}
