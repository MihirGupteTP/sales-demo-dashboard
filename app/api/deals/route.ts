import { NextResponse } from 'next/server';
import { fetchHubSpotDeals } from '@/lib/hubspot';

export async function GET() {
  try {
    const deals = await fetchHubSpotDeals();
    return NextResponse.json(
      { deals, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('GET /api/deals error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
