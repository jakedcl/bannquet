import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { AvalancheSection } from '@/components/mountain-weather/AvalancheSection';
import { avalancheAvgPoints, avalancheRuleSummary } from '@/lib/mountain-weather/avalanche-bindings';
import { readAvalancheHub } from '@/lib/mountain-weather/read-place-avalanche';

export const dynamic = 'force-dynamic';

export default async function AvalancheHubPage() {
  const hub = await readAvalancheHub();
  const overview: Parameters<typeof AvalancheSection>[0]['data'] = {
    binding: {
      centers: ['MWAC', 'NYSAC'],
      bindReason: avalancheRuleSummary(),
    },
    centers: [hub.mwac, hub.nysac],
    avg: null,
  };

  const points = avalancheAvgPoints();

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
        </nav>
        <LargeTitle title="Avalanche" eyebrow="Snow hub" />
        <p className="text-sm text-gray-700">{avalancheRuleSummary()}</p>
        <AvalancheSection data={overview} showAvg={false} />
        <section className="space-y-2">
          <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">AVG guidance points</h2>
          <p className="text-sm text-gray-700">One subpage per NWS avalanche weather guidance (AVG) point ({points.length}).</p>
          <ul className="columns-1 gap-x-8 text-sm sm:columns-2">
            {points.map((p) => (
              <li key={p.slug} className="mb-1 break-inside-avoid">
                <Link href={`/mountain-weather/snow/avalanche/${p.slug}`} className="font-bold underline">
                  {p.title}
                </Link>
                <span className="text-gray-700"> · {p.office}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">Example place sections</h2>
          <p className="text-gray-700">
            <Link href="/mountain-weather/new-hampshire/presidential-range/mount-washington" className="font-bold underline">
              Mount Washington
            </Link>
            {' · '}
            <Link href="/mountain-weather/new-york/adirondack-high-peaks/mount-marcy" className="font-bold underline">
              Mount Marcy
            </Link>
          </p>
        </section>
      </div>
    </PageWrapper>
  );
}