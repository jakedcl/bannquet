import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { OfficeBulletinBundle } from '@/lib/mountain-weather/read-office-bulletins';
import type { NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import {
  NWS_AFD_ALY_DEF,
  NWS_AFD_BTV_DEF,
  NWS_AFD_CAR_DEF,
  NWS_AFD_GYX_DEF,
  NWS_HWO_BTV_DEF,
} from '@/lib/mountain-weather/registry';
import type { BulletinOffice } from '@/lib/mountain-weather/bulletin-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

const AFD_DEF: Record<BulletinOffice, SourceDef> = {
  BTV: NWS_AFD_BTV_DEF,
  ALY: NWS_AFD_ALY_DEF,
  GYX: NWS_AFD_GYX_DEF,
  CAR: NWS_AFD_CAR_DEF,
};

const GHWO_URL: Record<BulletinOffice, string> = {
  BTV: 'https://www.weather.gov/erh/ghwo?wfo=btv',
  ALY: 'https://www.weather.gov/erh/ghwo?wfo=aly',
  GYX: 'https://www.weather.gov/erh/ghwo?wfo=gyx',
  CAR: 'https://www.weather.gov/erh/ghwo?wfo=car',
};

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

function ProductBlock({
  title,
  def,
  result,
  defaultOpen,
}: {
  title: string;
  def: SourceDef;
  result: SourceResult<NwsTextProduct>;
  defaultOpen?: boolean;
}) {
  const stale = result.status === 'stale' ? ' · stale' : '';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title={title} subtitle={`${def.org} (unavailable)${stale}`}>
        <p className="text-sm font-bold">{result.error ?? `${title} did not load.`}</p>
        <p className="text-xs text-gray-700">
          <a href={def.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Latest via API
          </a>
        </p>
      </CollapsibleSection>
    );
  }

  const data = result.data;
  return (
    <CollapsibleSection
      title={title}
      subtitle={`${def.org} · ${def.kind}${stale}`}
      defaultOpen={defaultOpen ?? false}
    >
      <div className="space-y-3 text-sm">
        {data.preamble ? (
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-900">{data.preamble}</pre>
        ) : null}
        {data.sections.map((section) => (
          <CollapsibleSection key={section.key} title={section.title} defaultOpen={false}>
            <pre className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{section.body || '—'}</pre>
          </CollapsibleSection>
        ))}
        <p className="text-xs text-gray-700">
          Issued {formatEt(result.issuedAt)} ET · {data.sections.length} sections ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Product JSON
          </a>
        </p>
      </div>
    </CollapsibleSection>
  );
}

export function BulletinsSection({ bundle }: { bundle: OfficeBulletinBundle | null }) {
  if (!bundle) return null;
  const afdDef = AFD_DEF[bundle.office];

  return (
    <CollapsibleSection title="Bulletins" subtitle={`NWS ${bundle.office} · AFD${bundle.office === 'BTV' ? ' + HWO' : ''}`} defaultOpen={false}>
      <div className="space-y-3">
        <ProductBlock title="Area Forecast Discussion (AFD)" def={afdDef} result={bundle.afd} defaultOpen />
        {bundle.office === 'BTV' && bundle.hwo !== null ? (
          <ProductBlock title="Hazardous Weather Outlook (HWO)" def={NWS_HWO_BTV_DEF} result={bundle.hwo} />
        ) : (
          <CollapsibleSection
            title="Hazardous Weather Outlook"
            subtitle={`${AFD_DEF[bundle.office].org} · link only`}
            defaultOpen={false}
          >
            <p className="text-sm">
              Text HWO is not shown in-page for {bundle.office}; use the graphical outlook.
            </p>
            <p className="text-xs text-gray-700">
              <a href={GHWO_URL[bundle.office]} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                Graphical Hazardous Weather Outlook (GHWO)
              </a>
            </p>
          </CollapsibleSection>
        )}
      </div>
    </CollapsibleSection>
  );
}