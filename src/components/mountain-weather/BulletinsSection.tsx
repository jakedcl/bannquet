import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceReceipt } from '@/components/mountain-weather/kit';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import type { OfficeBulletinBundle } from '@/lib/mountain-weather/read-office-bulletins';
import type { NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import type { MountainWfo } from '@/lib/mountain-weather/nws-office';
import { afdSourceDef, ghwoUrl } from '@/lib/mountain-weather/nws-office';
import { NWS_HWO_BTV_DEF } from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

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
        <SourceErrorNote label={title} href={result.sourceUrl ?? def.url} />
        <p className="text-xs text-ink-2">
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
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-ink">{data.preamble}</pre>
        ) : null}
        {data.sections.map((section) => (
          <CollapsibleSection key={section.key} title={section.title} defaultOpen={false}>
            <pre className="mt-1 whitespace-pre-wrap text-sm text-ink">{section.body || '—'}</pre>
          </CollapsibleSection>
        ))}
        <SourceReceipt
          org={def.org}
          product={title}
          at={result.issuedAt}
          status={result.status}
          expectedEveryHours={def.expectedEveryHours}
          href={result.sourceUrl}
        />
      </div>
    </CollapsibleSection>
  );
}

export function BulletinsSection({
  bundle,
  labeledByOffice,
}: {
  bundle: OfficeBulletinBundle | null;
  /** When true, prefix titles with the WFO id (for multi-office scope pages). */
  labeledByOffice?: boolean;
}) {
  if (!bundle) return null;
  const afdDef = afdSourceDef(bundle.office as MountainWfo);
  const officeTag = `NWS ${bundle.office}`;
  const hwoTag = bundle.office === 'BTV' ? ' + HWO' : labeledByOffice ? ' · GHWO link' : '';

  return (
    <CollapsibleSection
      title={labeledByOffice ? `${officeTag} · Bulletins` : 'Bulletins'}
      subtitle={
        labeledByOffice
          ? `AFD${hwoTag}`
          : `${officeTag} · AFD${bundle.office === 'BTV' ? ' + HWO' : ''}`
      }
      defaultOpen={false}
    >
      <div className="space-y-3">
        <ProductBlock title="Area Forecast Discussion (AFD)" def={afdDef} result={bundle.afd} defaultOpen />
        {bundle.office === 'BTV' && bundle.hwo !== null ? (
          <ProductBlock title="Hazardous Weather Outlook (HWO)" def={NWS_HWO_BTV_DEF} result={bundle.hwo} />
        ) : (
          <CollapsibleSection
            title="Hazardous Weather Outlook"
            subtitle={`${afdDef.org} · link only`}
            defaultOpen={false}
          >
            <p className="text-sm">
              Text HWO is not shown in-page for {bundle.office}; use the graphical outlook.
            </p>
            <p className="text-xs text-ink-2">
              <a
                href={ghwoUrl(bundle.office as MountainWfo)}
                className="font-bold underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Graphical Hazardous Weather Outlook (GHWO)
              </a>
            </p>
          </CollapsibleSection>
        )}
      </div>
    </CollapsibleSection>
  );
}