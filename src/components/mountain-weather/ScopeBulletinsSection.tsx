import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { BulletinsSection } from '@/components/mountain-weather/BulletinsSection';
import type { OfficeBulletinBundle } from '@/lib/mountain-weather/read-office-bulletins';

export function ScopeBulletinsSection({ bundles }: { bundles: OfficeBulletinBundle[] }) {
  if (bundles.length === 0) return null;
  if (bundles.length === 1) {
    return <BulletinsSection bundle={bundles[0]} />;
  }

  return (
    <CollapsibleSection
      title="Bulletins"
      subtitle={`${bundles.length} NWS offices cover this area`}
      defaultOpen={false}
    >
      <div className="space-y-4">
        {bundles.map((bundle) => (
          <div key={bundle.office}>
            <BulletinsSection bundle={bundle} labeledByOffice />
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}