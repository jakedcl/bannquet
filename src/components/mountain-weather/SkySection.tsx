import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { PlaceSkyData, UsnoTimedEvent } from '@/lib/mountain-weather/sky-types';
import { USNO_RSTT_ONEDAY_DEF } from '@/lib/mountain-weather/readers/usno-rstt-oneday';

function EventList({ title, rows }: { title: string; rows: UsnoTimedEvent[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={`${row.phen}-${row.time}`}>
            {row.phen}: {row.display ?? row.time ?? 'null (USNO)'} {row.marker ? `(${row.marker})` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkySection({ data }: { data: PlaceSkyData }) {
  return (
    <CollapsibleSection title="Sun &amp; moon" subtitle={`USNO RSTT · ${USNO_RSTT_ONEDAY_DEF.org} · times in ET`} defaultOpen={false}>
      {data.bundle.status === 'error' ? (
        <p className="text-sm font-bold text-red-800">USNO sky data did not load: {data.bundle.error}</p>
      ) : null}
      <p className="text-xs text-gray-700">{data.horizonNote}</p>
      <p className="text-xs text-gray-700">{data.apiNote}</p>
      <p className="text-xs text-gray-700">
        Coordinates: {data.coords.lat.toFixed(4)}, {data.coords.lon.toFixed(4)} ·{' '}
        <a href={USNO_RSTT_ONEDAY_DEF.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          API docs
        </a>
      </p>
      <div className="space-y-4">
        {data.days.map((day) => (
          <article key={day.dateEt} className="retro-box border-[#5c3a1e] bg-white/60 p-3">
            <h3 className="text-sm font-bold">
              {day.dateEt} · {day.dayOfWeek ?? '—'} ({day.tzLabel})
            </h3>
            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold">Moon phase (noon local)</dt>
                <dd>{day.curphase ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold">Illumination</dt>
                <dd>{day.fracillum ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold">Day length (sunrise – sunset)</dt>
                <dd>{day.dayLength ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold">Solar noon</dt>
                <dd>{day.sunEvents.find((e) => e.phen === 'Upper Transit')?.time ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold">Closest primary phase</dt>
                <dd>{day.closestPhase ? `${day.closestPhase.phase} · ${day.closestPhase.when}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold">DST flag (USNO)</dt>
                <dd>{day.isDst === null ? '—' : day.isDst ? 'Yes' : 'No'}</dd>
              </div>
              {day.label ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold">USNO label</dt>
                  <dd>{day.label}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <EventList title="Sun" rows={day.sunEvents} />
              <EventList title="Moon" rows={day.moonEvents} />
            </div>
          </article>
        ))}
      </div>
    </CollapsibleSection>
  );
}