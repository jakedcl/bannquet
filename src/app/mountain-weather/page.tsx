import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { chipClass } from '@/components/hub/Button';
import WeatherTicker from '@/components/ui/WeatherTicker';
import { WeatherHub } from '@/components/weather/WeatherHub';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { allMountainPlaces, MOUNTAIN_STATES, placeCount } from '@/lib/mountain-weather/places';
import { MountainPlaceSearch } from '@/components/mountain-weather/MountainPlaceSearch';
import { loadWeatherHub } from '@/lib/weather-hub';
import { isRegionCode, type RegionCode } from '@/lib/regions';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';

export const dynamic = 'force-dynamic';

export default async function MountainWeatherPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  if (state && isRegionCode(state)) {
    redirect(mountainWeatherPath(state as MountainStateCode));
  }

  const hub = await loadWeatherHub();
  const searchPlaces = allMountainPlaces().map((place) => ({
    name: place.name,
    href: mountainWeatherPath(place.state, place.sectionId, place.id),
    sectionTitle: place.sectionTitle,
    stateName: MOUNTAIN_STATES.find((s) => s.code === place.state)?.name ?? place.state,
  }));

  const counts = Object.fromEntries(
    MOUNTAIN_STATES.map((entry) => [
      entry.code,
      { sections: entry.sections.length, places: entry.sections.reduce((n, section) => n + section.places.length, 0) },
    ]),
  );

  return (
    <PageWrapper className="hub">
      <PageHero
        photo
        title="Mountain weather"
        subtitle={`${placeCount()} peaks and bases across New York, Vermont, New Hampshire and Maine.`}
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <WeatherTicker />
        <MountainPlaceSearch places={searchPlaces} />
        <div className="flex flex-wrap gap-2">
          <Link href={mountainWeatherPath('ny', 'adirondack-high-peaks', 'mount-marcy')} className={chipClass(false)}>Mount Marcy</Link>
          <Link href={mountainWeatherPath('nh', 'presidential-range', 'mount-washington')} className={chipClass(false)}>Mount Washington</Link>
        </div>
        <Card padded={false}>
          <ListGroup bare>
            <ListRow href="/mountain-weather/sources" title="Sources" subtitle="Every feed behind these pages, and how often it updates" />
            <ListRow href="/mountain-weather/conditions" title="Conditions" subtitle="Live station readings and the forecast for every place" />
            <ListRow href="/mountain-weather/snow" title="Snow" subtitle="Chance of snow, snow cover and avalanche forecasts" />
            <ListRow href="/mountain-weather/maps" title="Maps" subtitle="Radar, satellite, lightning, alerts and outlooks" />
          </ListGroup>
        </Card>
        <WeatherHub states={hub} counts={counts} />
      </div>
    </PageWrapper>
  );
}
