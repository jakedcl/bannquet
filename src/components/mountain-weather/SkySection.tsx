import { formatClock12 } from '@/lib/mountain-weather/format-display';
import { SourceReceipt } from '@/components/mountain-weather/kit';
import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import type { PlaceSkyData, UsnoTimedEvent } from '@/lib/mountain-weather/sky-types';
import { USNO_RSTT_ONEDAY_DEF } from '@/lib/mountain-weather/readers/usno-rstt-oneday';

/** USNO event names in words; the USNO term stays in brackets where it differs. */
const PHEN_WORDS: Record<string, string> = {
  'Begin Civil Twilight': 'First light (civil twilight begins)',
  'End Civil Twilight': 'Last light (civil twilight ends)',
  Rise: 'Rise',
  Set: 'Set',
  'Upper Transit': 'Highest in the sky (transit)',
};

function EventList({ title, rows }: { title: string; rows: UsnoTimedEvent[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={`${row.phen}-${row.time}`}>
            {PHEN_WORDS[row.phen] ?? row.phen}: {formatClock12(row.display) ?? row.time ?? '—'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkySection({ data }: { data: PlaceSkyData }) {
  if (data.bundle.status === 'error' && data.days.length === 0) {
    return null;
  }
  return (
    <CollapsibleSection title="Sun &amp; moon" subtitle={`Sun and moon data (RSTT) · ${USNO_RSTT_ONEDAY_DEF.org} · Eastern time`} defaultOpen={false}>
      {data.bundle.status === 'error' ? (
        <SourceErrorNote label="USNO sky data" href={data.bundle.sourceUrl ?? USNO_RSTT_ONEDAY_DEF.url} />
      ) : null}
      <p className="text-xs text-ink-2">{data.horizonNote}</p>
      <p className="text-xs text-ink-2">
        Coordinates: {data.coords.lat.toFixed(4)}, {data.coords.lon.toFixed(4)}
      </p>
      <div className="space-y-4">
        {data.days.map((day) => (
          <article key={day.dateEt} className="tile p-3">
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
                <dt className="text-xs font-bold">Nearest main moon phase</dt>
                <dd>{day.closestPhase ? `${day.closestPhase.phase} · ${day.closestPhase.when}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold">Daylight saving time</dt>
                <dd>{day.isDst === null ? '—' : day.isDst ? 'Yes' : 'No'}</dd>
              </div>
              {day.label ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold">Note from USNO</dt>
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
      <SourceReceipt
        org={USNO_RSTT_ONEDAY_DEF.org}
        product="Sun and moon data (RSTT)"
        at={data.bundle.issuedAt}
        verb="read"
        status={data.bundle.status}
        href={data.bundle.sourceUrl ?? USNO_RSTT_ONEDAY_DEF.url}
      />
    </CollapsibleSection>
  );
}