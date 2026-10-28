import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { ConditionsReport } from '@/components/weather/ConditionsReport';
import { loadWeatherExtremes } from '@/lib/weather-extremes';
import { loadFailed } from '@/lib/load-error';

export const dynamic = 'force-dynamic';

export default async function ConditionsPage() {
  let report: Awaited<ReturnType<typeof loadWeatherExtremes>> | null = null;
  let error: string | null = null;
  try {
    report = await loadWeatherExtremes();
  } catch (err) {
    error = loadFailed('conditions', err, 'The live conditions did not load. Try again in a minute.');
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-4xl px-4 py-10">
        {error || !report ? (
          <Window title="Live conditions">
            <p className="text-sm font-bold">{error ?? 'The live conditions did not load.'}</p>
          </Window>
        ) : (
          <ConditionsReport report={report} />
        )}
      </div>
    </PageWrapper>
  );
}
