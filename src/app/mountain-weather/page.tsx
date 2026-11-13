import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import WeatherTicker from '@/components/ui/WeatherTicker';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { MOUNTAIN_STATES, placeCount } from '@/lib/mountain-weather/places';
import { isRegionCode } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export default async function MountainWeatherPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  if (state && isRegionCode(state)) {
    redirect(`/mountain-weather/${state}`);
  }

  return (
    <PageWrapper className="hub">
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <LargeTitle title="Mountain Weather" />
        <p className="text-sm text-gray-700">
          {placeCount()} peaks and bases across New York, Vermont, New Hampshire, and Maine.
        </p>
        <WeatherTicker />
        <Card padded={false}>
          <ListGroup bare>
            <ListRow href="/mountain-weather/conditions" title="Conditions" subtitle="Live regional extremes" />
          </ListGroup>
        </Card>
        <Card title="States" padded={false}>
          <ListGroup bare>
            {MOUNTAIN_STATES.map((entry) => (
              <ListRow
                key={entry.code}
                href={`/mountain-weather/${entry.code}`}
                title={entry.name}
                subtitle={`${entry.sections.length} sections · ${entry.sections.reduce((n, s) => n + s.places.length, 0)} places`}
              />
            ))}
          </ListGroup>
        </Card>
        <p className="text-sm">
          <Link href="/mountain-weather/ny/adirondack-high-peaks/mt-marcy" className="font-bold underline">
            Mount Marcy
          </Link>
          {' · '}
          <Link href="/mountain-weather/nh/presidential-range/mt-washington" className="font-bold underline">
            Mount Washington
          </Link>
        </p>
      </div>
    </PageWrapper>
  );
}
