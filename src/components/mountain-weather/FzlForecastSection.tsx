import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { FzlPlaceSlice, FzlRadat } from '@/lib/mountain-weather/fzl-types';
import { NWS_FZL_ALY_DEF, NWS_FZL_GYX_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

const OFFICE_DEF = {
  ALY: NWS_FZL_ALY_DEF,
  GYX: NWS_FZL_GYX_DEF,
} as const;

function formatEt(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatLevelsFt(levels: number[]): string {
  if (levels.length === 0) return '—';
  return levels.map((ft) => `${ft.toLocaleString('en-US')} ft MSL`).join(', ');
}

function RadatTable({ radat }: { radat: FzlRadat }) {
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-bold uppercase text-gray-700">RADAT kind</dt>
        <dd>{radat.kind}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold uppercase text-gray-700">Payload</dt>
        <dd className="font-mono text-[11px]">{radat.payload}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold uppercase text-gray-700">RH at crossing</dt>
        <dd>
          {radat.rhPercent !== null
            ? `${radat.rhPercent}%${radat.rhLevel ? ` (${radat.rhLevel}est level)` : ''}`
            : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-bold uppercase text-gray-700">Freezing level(s)</dt>
        <dd>{formatLevelsFt(radat.levelsFt)}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold uppercase text-gray-700">Additional crossings</dt>
        <dd>{radat.additionalCrossings > 0 ? radat.additionalCrossings : '—'}</dd>
      </div>
      {radat.decodeNote ? (
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold uppercase text-gray-700">Note</dt>
          <dd>{radat.decodeNote}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function FzlForecastSection({ result }: { result: SourceResult<FzlPlaceSlice> | null }) {
  if (!result) return null;

  const def = result.data ? OFFICE_DEF[result.data.office] : null;
  const stale = result.status === 'stale' ? ' · stale' : '';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title="Freezing level (FZL / RADAT)" subtitle={`${def?.org ?? 'NWS'} (unavailable)${stale}`}>
        <p className="text-sm font-bold">{result.error ?? 'FZL did not load.'}</p>
        {def ? (
          <p className="text-xs text-gray-700">
            <a href={def.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
              Latest via API
            </a>
          </p>
        ) : null}
      </CollapsibleSection>
    );
  }

  const { bulletin, office } = result.data;
  const obs = bulletin.observation;
  const sourceDef = def ?? OFFICE_DEF[office];

  return (
    <CollapsibleSection
      title="Freezing level (FZL / RADAT)"
      subtitle={`${sourceDef.org} · ${sourceDef.kind}${stale}`}
      defaultOpen={false}
    >
      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase text-gray-700">Office</dt>
            <dd>NWS {office}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-gray-700">Station</dt>
            <dd>{obs?.station ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-gray-700">RADAT cycle (UTC)</dt>
            <dd>{obs?.cycleHhmm ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-gray-700">Product PIL</dt>
            <dd className="font-mono text-[11px]">{bulletin.productPil ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase text-gray-700">WMO header</dt>
            <dd className="font-mono text-[11px]">{bulletin.wmoHeader ?? '—'}</dd>
          </div>
        </dl>

        {obs?.radat ? <RadatTable radat={obs.radat} /> : <p className="text-sm">No RADAT line parsed.</p>}

        {bulletin.preamble ? (
          <CollapsibleSection title="Full bulletin text" defaultOpen={false}>
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-900">{bulletin.rawText}</pre>
          </CollapsibleSection>
        ) : null}

        <p className="text-xs text-gray-700">
          Issued {formatEt(result.issuedAt)} ET ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Product JSON
          </a>
          {' · '}
          <a
            href={`https://forecast.weather.gov/product.php?issuedby=${office}&product=FZL`}
            className="font-bold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            NWS product page
          </a>
        </p>
      </div>
    </CollapsibleSection>
  );
}