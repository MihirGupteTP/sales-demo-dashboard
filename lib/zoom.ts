import { Meeting, MeetingStatus } from '@/types';
import { parseISO } from 'date-fns';

const ZOOM_BASE = 'https://api.zoom.us/v2';
const ACCOUNT_ID   = process.env.ZOOM_ACCOUNT_ID;
const CLIENT_ID    = process.env.ZOOM_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

// ── Token cache (module-level, 1h TTL) ───────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getZoomAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  if (!ACCOUNT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Zoom credentials not configured');
  }
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  if (!res.ok) throw new Error(`Zoom OAuth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken!;
}

// ── Extract Zoom meeting ID from URL ─────────────────────────────────────────
export function extractZoomMeetingId(url: string): string | null {
  const match = url.match(/\/j\/(\d{9,11})/);
  return match ? match[1] : null;
}

// ── Fetch who hosted (booked) a Zoom meeting ─────────────────────────────────
async function getZoomMeetingHost(meetingId: string, token: string): Promise<string | null> {
  const res = await fetch(`${ZOOM_BASE}/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Zoom meeting ${meetingId}: ${res.status}`);
  const data = await res.json();
  return (data.host_email as string | undefined)?.toLowerCase() ?? null;
}

// ── Fetch participant count for a past meeting ────────────────────────────────
// Returns total attendees; the Zoom host is always participant[0],
// so >= 2 means at least one external person joined.
async function getParticipantCount(meetingId: string, token: string): Promise<number | null> {
  const res = await fetch(
    `${ZOOM_BASE}/report/meetings/${meetingId}/participants?page_size=300`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null;   // data expired or meeting never ended
  if (!res.ok) throw new Error(`Zoom participants ${meetingId}: ${res.status}`);
  const data = await res.json();
  return (data.participants ?? []).length as number;
}

// ── Main enrichment function ──────────────────────────────────────────────────
// For every meeting:
//   • host_email → bookedBy (Zoom is source of truth for who booked the meeting)
// For past meetings only (not cancelled/rescheduled):
//   • participant count ≥ 2 → attended   (host + at least 1 external)
//   • participant count < 2  → no_show
//   • null (data expired)    → keep HubSpot outcome
export async function enrichWithZoomData(
  meetings: Meeting[],
  emailToRepName: Map<string, string>
): Promise<Meeting[]> {
  if (!ACCOUNT_ID || !CLIENT_ID || !CLIENT_SECRET) return meetings;

  let token: string;
  try {
    token = await getZoomAccessToken();
  } catch {
    console.warn('Zoom auth failed, skipping enrichment');
    return meetings;
  }

  const now = new Date();
  const enriched = [...meetings];

  const tasks = enriched
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => !!m.zoomMeetingUrl);

  await Promise.allSettled(
    tasks.map(async ({ m, idx }) => {
      const meetingId = extractZoomMeetingId(m.zoomMeetingUrl!);
      if (!meetingId) return;

      const isPast = parseISO(m.meetingDate) < now;
      const isTerminal = m.status === 'cancelled' || m.status === 'rescheduled';

      // Always try to get host for bookedBy
      const hostEmail = await getZoomMeetingHost(meetingId, token);
      const bookedBy = hostEmail
        ? (emailToRepName.get(hostEmail) ?? m.bookedBy)
        : m.bookedBy;

      let status: MeetingStatus = m.status;

      // Determine attendance for past, non-terminal meetings
      if (isPast && !isTerminal) {
        const count = await getParticipantCount(meetingId, token);
        if (count !== null) {
          // count >= 2: host + at least one external person joined
          status = count >= 2 ? 'attended' : 'no_show';
        }
        // null = Zoom data expired; keep HubSpot status
      }

      enriched[idx] = { ...enriched[idx], bookedBy, status };
    })
  );

  return enriched;
}
