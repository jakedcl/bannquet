import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { SnowSection } from '@/components/mountain-weather/SnowSection';
import { readSnowHub } from '@/lib/mountain-weather/read-place-snow';
import { getMountainPlace } from '@/lib/mountain-weather/places';
import { readPlaceSnow } from '@/lib/mountain-weather/read-place-snow';

export const dynamic = 'force-dynamic';

export default async function MountainSnowHubPage() {
  const hub = await readSnowHub();
  const marcy = getMountainPlace('ny', 'adirondack-high-peaks', 'mount-marcy');
  const marcySnow = marcy ? await readPlaceSnow(marcy) : null;

  const hubAsPlace: Parameters<typeof SnowSection>[0]['data'] | null = marcySnow
    ? {
        ...marcySnow,
        wpcImages: hub.wpc.data ?? [],
        nerfcImages: hub.nerfc.data ?? [],
        nohrscImages: hub.nohrscImgs.data ?? [],
        measured: [],
        pns: marcySnow.pns,
        lsrSnow: marcySnow.lsrSnow,
        mansfieldStake: hub.mansfieldStake?.data?.row
          ? {
              snowNew: hub.mansfieldStake.data.row.snowNew,
              snowTotal: hub.mansfieldStake.data.row.snowTotal,
              asOf: hub.mansfieldStake.issuedAt,
            }
          : null,
      }
    : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6">
        <nav className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">
            Mountain Weather
          </Link>
        </nav>
        <LargeTitle title="Snow" eyebrow="Hub" />
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            <Link href="/mountain-weather/snow/avalanche" className="font-bold underline">
              Avalanche
            </Link>{' '}
            — MWAC, NYSAC, and NWS avalanche weather guidance (AVG).
          </li>
        </ul>
        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">WSSI &amp; winter pages</h2>
          <ul className="list-disc pl-5">
            {hub.winterLinks.map((row) => (
              <li key={row.office}>
                {row.office}:{' '}
                <a href={row.wssiUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                  WSSI
                </a>
                {' · '}
                <a href={row.winterPageUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                  NWS winter
                </a>
              </li>
            ))}
          </ul>
        </section>
        {hubAsPlace ? <SnowSection data={hubAsPlace} /> : <p className="text-sm">Snow hub data did not load.</p>}
      </div>
    </PageWrapper>
  );
}