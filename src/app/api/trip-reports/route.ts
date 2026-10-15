import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({
    success: true,
    data: [],
    count: 0,
    configured: true,
  });
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  return response;
}
