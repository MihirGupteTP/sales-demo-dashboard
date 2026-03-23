import { Meeting, MeetingStatus } from '@/types';
import { parseISO } from 'date-fns';

const ZOOM_BASE = 'https://api.zoom.us/v2';
const ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

// ────────────────────────────────────────────────────────────────────────────
// Token cache (module-level, reused within one server process until expiry)
// ────────────────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────────────────
// Extract Zoom meeting ID from a Zoom URL
// e.g. https://zoom.us/j/12345678901 or https://company.zoom.us/j/12345678901?pwd=xxx
// ────────────────────────────────────────────────────────────────────────────
export function extractZoomMeetingId(url: string): string | null {
  const match = url.match(/\/j\/(\d{9,11})/);
  return match ? match[1] : null;
}

// ────────────────────────────────────────────────────────────────────────────
// Fetch meeting participants from Zoom Reports API
// Returns number of non-host participants who joined
// ────────────────────────────────────────────────────────────────────────────
async function getExternalParticipantCount(meetingId: string, token: string): Promise<number> {
  const res = await fetch(
    `${ZOOM_BASE}/report/meetings/${meetingId}/participants?page_size=300`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 404 = meeting not found in reports (too old, or never ended)
  if (res.status === 404) return 0;
  if (!res.ok) throw new Error(`Zoom participants ${meetingId}: ${res.status}`);

  const data = await res.json();
  const participants: { user_email?: string; id?: string }[] = data.participants ?? [];

  // Filter out the host (no email usually means host in many setups; or compare against known host list)
  // Conservative approach: count everyone who joined; host is always present so subtract 1 if > 0
  return Math.max(0, participants.length - 1);
}

// ────────────────────────────────────────────────────────────────────────────
// Enrich a list of meetings with Zoom attendance data
// Only processes past meetings that have a Zoom URL
// ────────────────────────────────────────────────────────────────────────────
export async function enrichWithZoomAttendance(meetings: Meeting[]): Promise<Meeting[]> {
  const now = new Date();

  // Skip if Zoom is not configured
  if (!ACCOUNT_ID || !CLIENT_ID || !CLIENT_SECRET) return meetings;

  let token: string;
  try {
    token = await getZoomAccessToken();
  } catch {
    // Zoom unavailable — return meetings with HubSpot statuses unchanged
    console.warn('Zoom auth failed, skipping attendance enrichment');
    return meetings;
  }

  const enriched = [...meetings];

  // Build tasks only for past meetings that have a Zoom URL and aren't already cancelled/rescheduled
  const tasks = enriched
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => {
      const isPast = parseISO(m.meetingDate) < now;
      const hasZoom = !!m.zoomMeetingUrl;
      const notTerminal = m.status !== 'cancelled' && m.status !== 'rescheduled';
      return isPast && hasZoom && notTerminal;
    });

  // Run all Zoom calls in parallel; individual failures don't break the response
  const results = await Promise.allSettled(
    tasks.map(async ({ m, idx }) => {
      const meetingId = extractZoomMeetingId(m.zoomMeetingUrl!);
      if (!meetingId) return;

      const externalCount = await getExternalParticipantCount(meetingId, token);
      const newStatus: MeetingStatus = externalCount >= 1 ? 'attended' : 'no_show';
      enriched[idx] = { ...enriched[idx], status: newStatus };
    })
  );

  // Log any individual Zoom failures (non-fatal)
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Zoom enrichment error (non-fatal):', result.reason);
    }
  }

  return enriched;
}
