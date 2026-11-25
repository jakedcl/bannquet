import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { addCalendarDays, easternDate, formatEasternTime } from '@/lib/fishing/clock';
import { easternMonthDay, loadDailyMedians } from '@/lib/fishing/daily-stats';
import { withVerdicts } from '@/lib/fishing/flow-verdict';
import { plainWaterName } from '@/lib/fishing/readings';
import { DEFAULT_TIDE_STATION } from '@/lib/fishing/tide-stations';
import { loadTides, nextExtreme } from '@/lib/fishing/tides';
import { loadMountainGauges } from '@/lib/fishing/usgs';

/** Two half-width tiles under the summit conditions: the map (opens /map) and a fishing glance. */
export function HomeTiles() {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3">
      <MapTile />
      <Suspense fallback={<FishingFrame><p className="text-caption text-ink-2">Loading…</p></FishingFrame>}>
        <FishingGlance />
      </Suspense>
    </div>
  );
}

function MapTile() {
  return (
    <Link href="/map" className="panel relative block aspect-square overflow-hidden no-underline" aria-label="Open the map">
      <Image
        src="/home-map.jpg"
        alt="The Northeast on the Bannquet map"
        fill
        unoptimized
        sizes="(max-width: 768px) 50vw, 360px"
        className="object-cover"
      />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-banner px-3 py-2 font-heading text-meta font-bold uppercase text-on-dark">
        Map <span aria-hidden="true">›</span>
      </span>
    </Link>
  );
}

function FishingFrame({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/fishing" className="panel flex min-h-0 flex-col overflow-hidden no-underline" aria-label="Open fishing">
      <span className="panel-bar flex items-center justify-between">
        Fishing <span aria-hidden="true">›</span>
      </span>
      <span className="flex flex-1 flex-col justify-center gap-2 px-3 py-2.5">{children}</span>
    </Link>
  );
}

/** Next tide at the default station, and the first two rivers with a current reading. */
async function FishingGlance() {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const station = DEFAULT_TIDE_STATION;
  const begin = easternDate(now);

  const [tideResult, gaugeResult] = await Promise.allSettled([
    loadTides(station.id, begin, addCalendarDays(begin, 1)),
    loadMountainGauges(),
  ]);
  const next = tideResult.status === 'fulfilled' ? nextExtreme(tideResult.value.extremes, now) : null;

  let rivers: Array<{ site: string; name: string; text: string }> = [];
  if (gaugeResult.status === 'fulfilled') {
    const gauges = gaugeResult.value;
    let medians: Record<string, number> = {};
    try {
      const { month, day } = easternMonthDay(now);
      medians = await loadDailyMedians(gauges.map((gauge) => gauge.site), month, day);
    } catch {
      // Without medians a river shows its flow in cfs instead of a verdict.
    }
    rivers = withVerdicts(gauges, medians)
      .filter((gauge) => gauge.flowState === 'value' && gauge.flow)
      .slice(0, 2)
      .map((gauge) => ({ site: gauge.site, name: plainWaterName(gauge.name), text: gauge.verdict ?? `${gauge.flow} cfs` }));
  }

  return (
    <FishingFrame>
      <span className="block">
        <span className="block text-tag font-bold uppercase tracking-label text-ink-3">Next tide</span>
        <span className="block text-meta font-bold">
          {next ? `${next.kind === 'H' ? 'High' : 'Low'} ${next.feet.toFixed(1)} ft · ${formatEasternTime(next.time)}` : 'Not available'}
        </span>
        <span className="block truncate text-caption text-ink-2">{station.label}</span>
      </span>
      <span className="block">
        <span className="block text-tag font-bold uppercase tracking-label text-ink-3">Streams</span>
        {rivers.length === 0 ? (
          <span className="block text-meta text-ink-2">No current readings</span>
        ) : (
          rivers.map((river) => (
            <span key={river.site} className="block truncate text-meta">
              <span className="font-bold">{river.text}</span> · {river.name}
            </span>
          ))
        )}
      </span>
    </FishingFrame>
  );
}
