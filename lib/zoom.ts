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

// Internal/host email domain — everyone else is treated as "the prospect".
const INTERNAL_EMAIL_DOMAIN = 'truckerpath.com';

interface ZoomParticipant {
  user_email?: string;
  email?: string;
  name?: string;
}

// ── Fetch participant emails for a past meeting ──────────────────────────────
// Returns lowercase emails of all participants, or null if Zoom has purged
// the report (meetings older than ~30 days or never ended).
async function getParticipantEmails(meetingId: string, token: string): Promise<string[] | null> {
  const res = await fetch(
    `${ZOOM_BASE}/report/meetings/${meetingId}/participants?page_size=300`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null;   // data expired or meeting never ended
  if (!res.ok) throw new Error(`Zoom participants ${meetingId}: ${res.status}`);
  const data = await res.json();
  const participants = (data.participants ?? []) as ZoomParticipant[];
  return participants
    .map((p) => (p.user_email ?? p.email ?? '').toLowerCase())
    .filter((e) => e.length > 0);
}

// A prospect is any participant whose email domain is NOT the internal domain.
// Missing-email participants are ignored (Zoom sometimes omits email for
// dial-ins or unauthenticated guests — those would otherwise inflate attended).
function hasProspectParticipant(emails: string[]): boolean {
  return emails.some((e) => {
    const domain = e.split('@')[1];
    return domain && domain !== INTERNAL_EMAIL_DOMAIN;
  });
}

// ── Main enrichment function ──────────────────────────────────────────────────
// For every meeting:
//   • host_email → bookedBy (Zoom is source of truth for who booked the meeting)
// For past meetings only (not cancelled/rescheduled):
//   • any non-truckerpath.com participant → attended
//   • only truckerpath.com participants   → no_show
//   • null (data expired)                 → keep HubSpot outcome
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
        const emails = await getParticipantEmails(meetingId, token);
        if (emails !== null) {
          status = hasProspectParticipant(emails) ? 'attended' : 'no_show';
        }
        // null = Zoom data expired; keep HubSpot status
      }

      enriched[idx] = { ...enriched[idx], bookedBy, status };
    })
  );

  return enriched;
}
