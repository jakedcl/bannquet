import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceReceipt, shortOrg } from '@/components/mountain-weather/kit';
import { discussionHeading, reflowProductText } from '@/lib/mountain-weather/format-display';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import type { OfficeBulletinBundle } from '@/lib/mountain-weather/read-office-bulletins';
import type { NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import type { MountainWfo } from '@/lib/mountain-weather/nws-office';
import { afdSourceDef, ghwoUrl } from '@/lib/mountain-weather/nws-office';
import { NWS_HWO_BTV_DEF } from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

function ProductBlock({
  title,
  product,
  def,
  result,
  defaultOpen,
}: {
  title: string;
  /** Official product name, shown under the plain title. */
  product: string;
  def: SourceDef;
  result: SourceResult<NwsTextProduct>;
  defaultOpen?: boolean;
}) {
  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title={title} subtitle={`${product} (could not load)`}>
        <SourceErrorNote label={title} href={result.sourceUrl ?? def.url} />
        <SourceReceipt org={def.org} product={product} status="error" href={def.url} />
      </CollapsibleSection>
    );
  }

  const data = result.data;
  return (
    <CollapsibleSection
      title={title}
      subtitle={`${product} · ${shortOrg(def.org)}`}
      defaultOpen={defaultOpen ?? false}
    >
      <div className="space-y-3 text-sm">
        {data.sections.map((section) => (
          <CollapsibleSection key={section.key} title={discussionHeading(section.title)} defaultOpen={false}>
            <div className="space-y-2 text-meta text-ink">
              {section.body.trim() ? (
                reflowProductText(section.body).map((para, i) => (
                  <p key={i} className="whitespace-pre-line">{para}</p>
                ))
              ) : (
                <p className="text-ink-2">Nothing in this section today.</p>
              )}
            </div>
          </CollapsibleSection>
        ))}
        <SourceReceipt
          org={def.org}
          product={product}
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
      title={labeledByOffice ? `What the forecasters are thinking · ${officeTag}` : 'What the forecasters are thinking'}
      subtitle={`Area Forecast Discussion (AFD)${hwoTag ? ' and Hazardous Weather Outlook' : ''} · ${officeTag}`}
      defaultOpen={false}
    >
      <div className="space-y-3">
        <ProductBlock title="Forecast discussion" product="Area Forecast Discussion (AFD)" def={afdDef} result={bundle.afd} defaultOpen />
        {bundle.office === 'BTV' && bundle.hwo !== null ? (
          <ProductBlock title="Hazards in the coming week" product="Hazardous Weather Outlook (HWO)" def={NWS_HWO_BTV_DEF} result={bundle.hwo} />
        ) : (
          <CollapsibleSection
            title="Hazards in the coming week"
            subtitle={`Graphical Hazardous Weather Outlook · ${shortOrg(afdDef.org)} · link only`}
            defaultOpen={false}
          >
            <p className="text-sm">
              This office publishes its hazard outlook as maps; open them on the NWS site.
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