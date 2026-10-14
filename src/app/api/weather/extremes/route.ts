import { NextResponse } from 'next/server';
import { loadWeatherExtremes } from '@/lib/weather-extremes';

export async function GET() {
  const report = await loadWeatherExtremes();
  const response = NextResponse.json(report.success ? {
    success: true,
    stats: report.stats,
    spots: report.spots,
    attempted: report.attempted,
    succeeded: report.succeeded,
    failed: report.failed,
  } : {
    success: false,
    error: report.error,
    attempted: report.attempted,
    failed: report.failed,
  }, { status: report.error === 'Failed to fetch weather data' ? 500 : 200 });

  if (report.success) {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }
  return response;
}
