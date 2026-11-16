import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { SnowSection } from '@/components/mountain-weather/SnowSection';
import { readSnowHub } from '@/lib/mountain-weather/read-place-snow';
import { nwsWinterPageUrl, wssiUrlForOffice } from '@/lib/mountain-weather/readers/wpc-pwpf-snow';
import type { PlaceSnowData } from '@/lib/mountain-weather/snow-types';

export const dynamic = 'force-dynamic';

export default async function MountainSnowHubPage() {
  const hub = await readSnowHub();
  const hubSnow: PlaceSnowData = {
    office: 'BTV',
    wpcImages: hub.wpc.data ?? [],
    nerfcImages: hub.nerfc.data ?? [],
    nohrscImages: hub.nohrscImgs.data ?? [],
    winterPageUrl: nwsWinterPageUrl('BTV'),
    wssiUrl: wssiUrlForOffice('BTV'),
    measured: [],
    pns: null,
    lsrSnow: [],
    mansfieldStake: hub.mansfieldStake?.data?.row
      ? {
          snowNew: hub.mansfieldStake.data.row.snowNew,
          snowTotal: hub.mansfieldStake.data.row.snowTotal,
          asOf: hub.mansfieldStake.issuedAt,
        }
      : null,
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6">
        <nav className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">
            Mountain Weather
          </Link>
        </nav>
        <LargeTitle title="Snow" eyebrow="Hub" />
        <p className="text-sm text-gray-700">Regional maps and guidance are below. For nearby measured snow and storm reports, open a place page such as <Link href="/mountain-weather/new-york/adirondack-high-peaks/mount-marcy" className="font-bold underline">Mount Marcy</Link>.</p>
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
        <SnowSection data={hubSnow} isHub />
      </div>
    </PageWrapper>
  );
}
