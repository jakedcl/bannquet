import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';

/** How the sources on this page are read, in plain words (collapsed). */
export function AboutSourcesSection({ notes }: { notes: string[] }) {
  const unique = [...new Set(notes.filter(Boolean))];
  if (unique.length === 0) return null;
  return (
    <CollapsibleSection title="About these sources" subtitle="How Bannquet reads them" defaultOpen={false}>
      <ul className="list-disc space-y-1.5 pl-5 text-meta text-ink-2">
        {unique.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
