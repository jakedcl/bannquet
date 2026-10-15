import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/db';
import { isPostKind } from '@/lib/post-kinds';
import { listTripReports } from '@/lib/trip-reports';

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      configured: false,
    });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : null;
    const type = searchParams.get('type');
    const data = await listTripReports({
      authorName: searchParams.get('authorName'),
      tag: searchParams.get('tag'),
      postKind: type && isPostKind(type) ? type : null,
      limit: Number.isFinite(limit) ? limit : null,
    });

    const response = NextResponse.json({
      success: true,
      data,
      count: data.length,
      configured: true,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trips',
      },
      { status: 500 },
    );
  }
}
