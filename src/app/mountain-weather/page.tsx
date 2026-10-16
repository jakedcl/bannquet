import PageWrapper from '@/components/ui/PageWrapper';
import { MountainWeather } from '@/components/weather/MountainWeather';
import { WeatherHub } from '@/components/weather/WeatherHub';
import { isRegionCode } from '@/lib/regions';
import { loadWeatherHub } from '@/lib/weather-hub';

export const dynamic = 'force-dynamic';

export default async function MountainWeatherPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  if (!isRegionCode(state)) {
    const states = await loadWeatherHub();
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <WeatherHub states={states} />
        </div>
      </PageWrapper>
    );
  }
  return (
    <PageWrapper className="bg-gray-50">
      <MountainWeather state={state} />
    </PageWrapper>
  );
}
