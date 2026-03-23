import { NextResponse } from 'next/server';
import { fetchHubSpotMeetings } from '@/lib/hubspot';
import { enrichWithZoomAttendance } from '@/lib/zoom';

export async function GET() {
  try {
    const meetings = await fetchHubSpotMeetings();
    const enriched = await enrichWithZoomAttendance(meetings);

    return NextResponse.json(
      { meetings: enriched, updatedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('GET /api/meetings error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
