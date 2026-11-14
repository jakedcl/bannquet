import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { AvalancheSection } from '@/components/mountain-weather/AvalancheSection';
import { AvgForecastSection } from '@/components/mountain-weather/AvgForecastSection';
import { avalancheAvgPointBySlug, avalancheBindingForPlace } from '@/lib/mountain-weather/avalanche-bindings';
import { findMountainPlaceCatalogEntry } from '@/lib/mountain-weather/places';
import { readPlaceAvalanche } from '@/lib/mountain-weather/read-place-avalanche';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';

export const dynamic = 'force-dynamic';

export default async function AvalancheAvgPointPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const point = avalancheAvgPointBySlug(slug);
  if (!point) notFound();

  const placeAvalanche = await readPlaceAvalanche(point.examplePlaceId);
  const avgOnly = placeAvalanche?.avg?.filter((a) => a.data?.pointMatch === point.pointMatch) ?? null;
  const binding = avalancheBindingForPlace(point.examplePlaceId);
  const catalog = findMountainPlaceCatalogEntry(point.examplePlaceId);
  const placeHref = catalog ? mountainWeatherPath(catalog.state, catalog.sectionId, catalog.id) : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6">
        <nav className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">
            Mountain Weather
          </Link>
          {' · '}
          <Link href="/mountain-weather/snow" className="font-bold underline">
            Snow
          </Link>
          {' · '}
          <Link href="/mountain-weather/snow/avalanche" className="font-bold underline">
            Avalanche
          </Link>
        </nav>
        <LargeTitle title={point.title} eyebrow={`NWS AVG · ${point.office}`} />
        {point.elevationNote ? <p className="text-sm text-gray-700">{point.elevationNote}</p> : null}
        {point.nearbyLabel ? <p className="text-sm text-gray-700">{point.nearbyLabel}</p> : null}
        {binding && placeHref ? (
          <p className="text-sm text-gray-700">
            Related place:{' '}
            <Link href={placeHref} className="font-bold underline">
              {catalog?.name ?? point.examplePlaceId}
            </Link>{' '}
            · {binding.bindReason}
          </p>
        ) : null}
        {placeAvalanche && binding ? (
          <AvalancheSection
            data={{
              binding: { centers: binding.centers, bindReason: binding.bindReason },
              centers: placeAvalanche.centers,
              avg: null,
            }}
            showAvg={false}
          />
        ) : null}
        <AvgForecastSection results={avgOnly} />
      </div>
    </PageWrapper>
  );
}