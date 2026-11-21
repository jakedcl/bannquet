import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import WeatherTicker from '@/components/ui/WeatherTicker';
import { buttonClass, tagClass } from '@/components/hub/Button';
import { Card } from '@/components/hub/Card';
import { PageHero } from '@/components/hub/PageHero';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import { HomeTiles } from '@/components/home/HomeTiles';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import { isDatabaseConfigured } from '@/db';
import { listGalleryPhotos, type GalleryPhoto } from '@/lib/gallery';
import { getMountainPlace } from '@/lib/mountain-weather/places';
import { hubGlanceFromBaseline, type HubGlance } from '@/lib/mountain-weather/hub-glance';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { loadMapData } from '@/lib/posts';
import { getViewer } from '@/app/sign-in/actions';

export const dynamic = 'force-dynamic';

const SUMMITS = [
  ['ny', 'adirondack-high-peaks', 'mount-marcy'],
  ['nh', 'presidential-range', 'mount-washington'],
  ['vt', 'northern-greens', 'mount-mansfield'],
  ['me', 'baxter-state-park', 'katahdin'],
] as const;

async function loadSummits(): Promise<HubGlance[]> {
  const now = new Date();
  const rows = await Promise.all(
    SUMMITS.map(async ([state, section, id]) => {
      const place = getMountainPlace(state, section, id);
      if (!place) return null;
      const result = await readNwsGridBaseline(place);
      return hubGlanceFromBaseline(result, { title: place.name, href: mountainWeatherPath(state, section, id) }, now);
    }),
  );
  return rows.filter((row): row is HubGlance => row !== null);
}

/** Newest pins and routes, and the newest photos. Empty without a database. */
async function loadLatest(viewerId: string | null) {
  if (!isDatabaseConfigured()) return { feed: [], photos: [] as GalleryPhoto[] };
  try {
    const [map, gallery] = await Promise.all([loadMapData(viewerId), listGalleryPhotos({ handle: null, before: null })]);
    const feed = map.points.features
      .filter((feature) => feature.properties.kind !== 'photo' && feature.properties.href)
      .sort((a, b) => String(b.properties.date ?? '').localeCompare(String(a.properties.date ?? '')))
      .slice(0, 3)
      .map((feature, index) => {
        const kind = String(feature.properties.kind ?? '');
        return {
          id: String(feature.properties.trackId || feature.properties.href || index),
          href: String(feature.properties.href),
          title: String(feature.properties.title ?? 'Untitled'),
          who: String(feature.properties.who ?? ''),
          tag: kind === 'route' ? 'Route' : isPinKind(kind) ? PIN_KIND_LABELS[kind] : 'Pin',
        };
      });
    return { feed, photos: gallery.photos.slice(0, 3) };
  } catch {
    return { feed: [], photos: [] as GalleryPhoto[] };
  }
}

/** Home: a hero, the two main tools, live conditions, summits, and short cuts to the map, fishing and photos. */
export default async function HomePage() {
  const viewer = await getViewer();
  const [summits, latest] = await Promise.all([loadSummits(), loadLatest(viewer?.id ?? null)]);

  return (
    <PageWrapper>
      <PageHero photo title="Bannquet" subtitle="Northeast peaks, weather, maps and fishing." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/mountain-weather" className={buttonClass('green', 'lg')}>Mountain weather</Link>
          <Link href="/fishing" className={buttonClass('green', 'lg')}>Fishing</Link>
        </div>

        <WeatherTicker />

        <Card title="Summit conditions" action={<Link href="/mountain-weather/conditions" className="-my-2 inline-flex min-h-11 items-center no-underline">Conditions ›</Link>} padded={false}>
          <WeatherGlanceList items={summits} />
        </Card>

        <HomeTiles />

        <Card title="Latest from the crew" action={<Link href="/map" className="-my-2 inline-flex min-h-11 items-center no-underline">Open map ›</Link>} padded={false}>
          {latest.feed.length > 0 ? (
            <ListGroup bare>
              {latest.feed.map((item) => (
                <ListRow
                  key={`${item.tag}-${item.id}`}
                  href={item.href}
                  title={item.title}
                  subtitle={item.who}
                  trailing={<span className={tagClass('arrow')}>{item.tag}</span>}
                />
              ))}
            </ListGroup>
          ) : (
            <p className="px-3.5 py-3 text-meta text-ink-2">Pins, routes and photos from the crew, on one map.</p>
          )}
        </Card>

        {latest.photos.length > 0 ? (
          <Card title="Recent photos" action={<Link href="/photos" className="-my-2 inline-flex min-h-11 items-center no-underline">Gallery ›</Link>}>
            <div className="grid grid-cols-3 gap-2">
              {latest.photos.map((photo) => (
                <Link key={photo.id} href={`/photos/${photo.id}`} className="panel block aspect-square !border-2">
                  <SmallPhotoImage url={photo.url} thumbUrl={photo.thumbUrl} alt={photo.caption ?? 'Photo'} width={240} height={240} className="h-full w-full object-cover" />
                </Link>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </PageWrapper>
  );
}
