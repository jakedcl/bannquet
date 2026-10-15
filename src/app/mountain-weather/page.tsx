import PageWrapper from '@/components/ui/PageWrapper';
import { ConditionsReport } from '@/components/weather/ConditionsReport';
import { MountainWeather } from '@/components/weather/MountainWeather';
import { loadWeatherExtremes } from '@/lib/weather-extremes';

export const dynamic = 'force-dynamic';

export default async function MountainWeatherPage() {
  let report: Awaited<ReturnType<typeof loadWeatherExtremes>> | null = null;
  let error: string | null = null;
  try {
    report = await loadWeatherExtremes();
  } catch (err) {
    error = err instanceof Error ? err.message : 'The live conditions did not load.';
  }

  return (
    <PageWrapper className="bg-gray-50">
      <MountainWeather>
        {error || !report ? (
          <p className="retro-box bg-beige p-4 text-sm font-bold">{error ?? 'The live conditions did not load.'}</p>
        ) : (
          <ConditionsReport report={report} showForecastLink={false} />
        )}
      </MountainWeather>
    </PageWrapper>
  );
}
