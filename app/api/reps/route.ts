import { NextResponse } from 'next/server';
import { fetchHubSpotOwners } from '@/lib/hubspot';

export async function GET() {
  try {
    const reps = await fetchHubSpotOwners();
    return NextResponse.json(
      { reps },
      {
        headers: {
          'Cache-Control': 's-maxage=600, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('GET /api/reps error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
