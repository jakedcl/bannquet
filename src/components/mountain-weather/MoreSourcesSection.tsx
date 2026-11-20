import { tagClass } from '@/components/hub/Button';
import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { moreSourcesHasAny, type MoreSourceGroups } from '@/lib/mountain-weather/more-sources';

const GROUP_LABEL = {
  office: 'NWS office products',
  mountain: 'Mountain and national guidance',
  land: 'Land, access, and research',
  national: 'Maps and outlooks',
} as const;

export function MoreSourcesSection({ groups }: { groups: MoreSourceGroups }) {
  if (!moreSourcesHasAny(groups)) return null;
  return (
    <CollapsibleSection title="More sources" subtitle="Every source, labeled shown here or link only. MWOBS and Mesonet terms apply.">
      <div className="space-y-4">
        {(Object.keys(GROUP_LABEL) as Array<keyof typeof GROUP_LABEL>).map((key) => {
          const items = groups[key];
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <h3 className="text-tag font-bold uppercase tracking-label text-ink-2">{GROUP_LABEL[key]}</h3>
              <ul className="ui-list mt-1">
                {items.map((item) => (
                  <li key={`${item.org}-${item.href}`}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-row-press flex min-h-12 items-center gap-2.5 py-2 no-underline"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-meta font-bold [overflow-wrap:anywhere]">{item.label}</span>
                        <span className="block text-caption text-ink-2">{item.org}</span>
                      </span>
                      <span className={tagClass(item.mode === 'ui' ? 'green' : 'outline')}>{item.mode === 'ui' ? 'Shown here' : 'Link only'}</span>
                      <span aria-hidden="true" className="text-brown-light">›</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
