import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
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
      <PageHero eyebrow={`Avalanche weather guidance · NWS ${point.office}`} title={point.title} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        {point.elevationNote ? <p className="text-meta text-ink-2">{point.elevationNote}</p> : null}
        {point.nearbyLabel ? <p className="text-meta text-ink-2">{point.nearbyLabel}</p> : null}
        {binding && placeHref ? (
          <Card padded={false}>
            <ListGroup bare>
              <ListRow href={placeHref} title={catalog?.name ?? point.examplePlaceId} subtitle="Related place: its forecast and measured conditions" />
            </ListGroup>
          </Card>
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
