import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
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
      <PageHero eyebrow="Mountain weather" title="Snow" subtitle="Regional snow maps and guidance, and the avalanche centers." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <Card padded={false}>
          <ListGroup bare>
            <ListRow href="/mountain-weather/snow/avalanche" title="Avalanche" subtitle="MWAC, NYSAC and NWS avalanche weather guidance" />
            <ListRow
              href="/mountain-weather/new-york/adirondack-high-peaks/mount-marcy?tab=snow"
              title="Snow near a place"
              subtitle="Measured snow and storm reports are on each place's Snow tab, for example Mount Marcy"
            />
          </ListGroup>
        </Card>
        <Card title="WSSI and winter pages" padded={false}>
          <ul className="ui-list">
            {hub.winterLinks.map((row) => (
              <li key={row.office} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-meta">
                <span className="min-w-12 font-bold">{row.office}</span>
                <a href={row.wssiUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                  Winter storm severity (WSSI)
                </a>
                <a href={row.winterPageUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                  NWS winter page
                </a>
              </li>
            ))}
          </ul>
        </Card>
        <SnowSection data={hubSnow} isHub />
      </div>
    </PageWrapper>
  );
}
