import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Window } from '@/components/retro/Window';
import { FishingRows } from '@/components/fishing/FishingRows';
import { ShoreMapFrame } from '@/components/fishing/ShoreMapFrame';
import { CrumbLeaf } from '@/components/ui/BackBar';
import PageWrapper from '@/components/ui/PageWrapper';
import { ADVISORIES_CHECKED, ADVISORIES_SOURCE, adviceFor, waterBody } from '@/lib/fishing/advisories';
import { nearestTideStation, shoreSpot } from '@/lib/fishing/shore-spots';

export const dynamic = 'force-dynamic';

export default async function ShoreSpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const spot = shoreSpot((await params).slug);
  if (!spot) notFound();
  const station = nearestTideStation(spot);
  const water = waterBody(spot.waterId);
  const advice = adviceFor(spot.waterId);

  return (
    <PageWrapper>
      <CrumbLeaf label={spot.name} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:py-10">
        <Window title={spot.name}>
          <p className="text-sm">{spot.access}</p>
          <p className="mt-2 text-sm">
            Tide station{' '}
            <Link href={`/fishing/saltwater?station=${station.slug}`} className="font-bold underline">
              {station.label}
            </Link>
          </p>
          <div className="retro-box-inset mt-4 bg-white">
            <ShoreMapFrame lat={spot.lat} lon={spot.lon} name={spot.name} />
          </div>
        </Window>
        <Window title="Eat safe">
          <p className="mb-3 text-sm">{water?.name}</p>
          <FishingRows
            rows={advice.map((row) => ({
              id: row.id,
              name: row.fish,
              detail: row.general,
              extra: row.sensitive,
            }))}
            headers={{ name: 'Fish', detail: 'General', extra: 'Sensitive' }}
            empty="No advisory for this water."
          />
          <p className="mt-3 text-xs">
            Sensitive: people who can become pregnant, under 50, and children under 15. Do not eat crab or lobster tomalley.
            {' '}
            <a href={ADVISORIES_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
              Last checked {ADVISORIES_CHECKED}
            </a>
          </p>
        </Window>
      </div>
    </PageWrapper>
  );
}
