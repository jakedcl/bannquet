import Link from 'next/link';
import { Window } from '@/components/retro/Window';
import { TideChart } from '@/components/fishing/TideChart';
import { TideTable, type TideRow } from '@/components/fishing/TideTable';
import { ForecastStrip } from '@/components/ui/ForecastStrip';
import { formatEasternDay, formatEasternRange, formatEasternTime } from '@/lib/fishing/clock';
import type { MarineForecast, WaterReading, WindReading } from '@/lib/fishing/marine';
import type { SkyDay } from '@/lib/fishing/sky';
import { TIDE_STATIONS, type TideStation } from '@/lib/fishing/tide-stations';
import { nextExtreme, type TideSet } from '@/lib/fishing/tides';

const UNAVAILABLE = 'Data unavailable';

function feet(value: number): string {
  return value.toFixed(1);
}

function tideRows(tides: TideSet): TideRow[] {
  return tides.extremes.map((extreme) => ({
    id: `${extreme.time}-${extreme.kind}`,
    day: formatEasternDay(extreme.time),
    time: formatEasternTime(extreme.time),
    tide: extreme.kind === 'H' ? 'High' : 'Low',
    feet: feet(extreme.feet),
    sort: extreme.time,
  }));
}

export function SaltwaterConditions({
  station,
  tides,
  water,
  wind,
  marine,
  sky,
  now,
}: {
  station: TideStation;
  tides: TideSet | null;
  water: WaterReading | null;
  wind: WindReading | null;
  marine: MarineForecast | null;
  sky: SkyDay;
  now: number;
}) {
  const next = tides ? nextExtreme(tides.extremes, now) : null;

  return (
    <Window title={`Saltwater · ${station.label}`}>
      <div className="space-y-4">
        <div className="flex gap-2 max-md:flex-nowrap max-md:overflow-x-auto md:flex-wrap" role="group" aria-label="Tide station">
          {TIDE_STATIONS.map((item) => {
            const on = item.slug === station.slug;
            return (
              <Link
                key={item.slug}
                href={`/fishing/saltwater?station=${item.slug}`}
                aria-current={on ? 'page' : undefined}
                className={`${on ? 'retro-button-yellow' : 'retro-button'} shrink-0 rounded-none px-3 py-1 text-xs font-bold uppercase max-md:!border max-md:!px-2 max-md:!py-0.5 max-md:!text-[11px] max-md:!leading-4 max-md:!shadow-none`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Next tide" value={next ? `${next.kind === 'H' ? 'High' : 'Low'} ${feet(next.feet)} ft` : tides ? 'No upcoming tide' : UNAVAILABLE} detail={next ? formatEasternTime(next.time) : station.officialName} />
          <Metric label="Water" value={water ? `${water.fahrenheit.toFixed(1)} °F` : UNAVAILABLE} detail={water ? water.stationName : null} />
          <Metric label="Wind" value={wind ? wind.text : UNAVAILABLE} detail={wind ? wind.stationName : null} />
          <Metric label="Sun" value={sky.sunrise && sky.sunset ? `${formatEasternTime(sky.sunrise)} – ${formatEasternTime(sky.sunset)}` : UNAVAILABLE} detail={sky.moonPhase} />
        </div>

        {marine && marine.alerts.length > 0 ? (
          <div className="retro-box-inset bg-white p-3">
            <p className="mb-2 text-sm font-bold uppercase">Marine alerts</p>
            <ul className="space-y-1">
              {marine.alerts.map((alert) => (
                <li key={alert.headline} className="text-sm font-bold">{alert.event}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {tides && tides.curve.length > 1 ? (
          <div className="retro-box-inset bg-white">
            <TideChart curve={tides.curve} extremes={tides.extremes} />
          </div>
        ) : (
          <p className="text-sm font-bold">{UNAVAILABLE}</p>
        )}

        {tides ? <TideTable rows={tideRows(tides)} /> : null}

        {marine ? (
          <ForecastStrip
            label={marine.zoneName}
            variant="text"
            items={marine.periods.map((period, index) => ({
              name: period.name,
              startTime: `${marine.zoneId}-${index}`,
              temperature: 0,
              shortForecast: period.text,
            }))}
          />
        ) : (
          <p className="text-sm font-bold">Marine forecast unavailable</p>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase">Best times, for fun</h2>
          {sky.periods.length === 0 ? (
            <p className="text-sm">None today.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {sky.periods.map((period) => (
                <li key={`${period.label}-${period.start}`}>
                  <span className="font-bold">{period.label}</span> {formatEasternRange(period.start, period.end)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Window>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <div className="retro-box-inset min-w-0 bg-white px-2 py-2">
      <p className="text-xs font-bold uppercase">{label}</p>
      <p className="break-words text-sm font-bold">{value}</p>
      {detail ? <p className="truncate text-xs text-gray-700">{detail}</p> : null}
    </div>
  );
}
