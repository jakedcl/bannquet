import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { MountainWeather } from '@/components/weather/MountainWeather';
import WeatherTicker from '@/components/ui/WeatherTicker';
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
      <PageWrapper className="hub">
        <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-6 md:pt-10">
          <LargeTitle title="Mountain Weather" />
          <WeatherTicker />
          <WeatherHub states={states} />
        </div>
      </PageWrapper>
    );
  }
  return (
    <PageWrapper className="hub">
      <MountainWeather state={state} />
    </PageWrapper>
  );
}
