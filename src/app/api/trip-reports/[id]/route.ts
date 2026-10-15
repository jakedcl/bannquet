import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/db';
import { getTripReport } from '@/lib/trip-reports';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Trip ID is required' }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Postgres is not connected. Set DATABASE_URL.' },
      { status: 503 },
    );
  }

  try {
    const report = await getTripReport(id);
    if (!report) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, data: report });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trip',
      },
      { status: 500 },
    );
  }
}
