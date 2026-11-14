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
    <CollapsibleSection title="More sources" subtitle="Link-only items stay labeled; MWOBS and Mesonet terms apply.">
      <div className="space-y-4 text-sm">
        {(Object.keys(GROUP_LABEL) as Array<keyof typeof GROUP_LABEL>).map((key) => {
          const items = groups[key];
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <h3 className="text-xs font-bold uppercase tracking-wide">{GROUP_LABEL[key]}</h3>
              <ul className="mt-2 space-y-1">
                {items.map((item) => (
                  <li key={`${item.org}-${item.href}`}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                      {item.label}
                    </a>
                    <span className="text-gray-700"> · {item.org} · {item.mode === 'ui' ? 'In UI' : 'Link only'}</span>
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
