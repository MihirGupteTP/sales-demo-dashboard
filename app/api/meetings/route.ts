import { NextResponse } from 'next/server';
import { fetchHubSpotMeetings, fetchOwnerEmailToNameMap, enrichMeetingsWithDealData } from '@/lib/hubspot';
import { enrichWithZoomData } from '@/lib/zoom';

export async function GET() {
  try {
    const [rawMeetings, emailToRepName] = await Promise.all([
      fetchHubSpotMeetings(),
      fetchOwnerEmailToNameMap(),
    ]);

    const { meetings: dealEnriched, compliance } = await enrichMeetingsWithDealData(rawMeetings);
    const enriched = await enrichWithZoomData(dealEnriched, emailToRepName);

    return NextResponse.json(
      { meetings: enriched, compliance, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('GET /api/meetings error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
