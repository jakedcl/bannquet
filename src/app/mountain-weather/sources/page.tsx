import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { sourceCatalog } from '@/lib/mountain-weather/source-catalog';

export const metadata = { title: 'Mountain weather sources' };

/** Every feed mountain weather reads, who runs it, how often it updates, and what is worth knowing. */
export default function MountainWeatherSourcesPage() {
  const { rows, stationCount, notes } = sourceCatalog();
  const tabs = [...new Set(rows.map((row) => row.tab))];
  return (
    <PageWrapper>
      <PageHero eyebrow="Mountain weather" title="Sources" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <p className="text-meta text-ink-2">
          Everything on mountain weather comes from these feeds, all from government or university sources. For whether each is working right now
          for a place, open that place&rsquo;s More tab: &ldquo;Sources for this page&rdquo; shows a live dot and the age of every source.
        </p>
        {tabs.map((tab) => (
          <CollapsibleSection key={tab} title={`${tab} tab`} subtitle={`${rows.filter((r) => r.tab === tab).length} feeds`} defaultOpen={tab !== 'Other'}>
            <ul className="ui-list">
              {rows.filter((r) => r.tab === tab).map((row) => (
                <li key={row.id}>
                  <a href={row.url.replace(/\{[^}]+\}/g, '')} target="_blank" rel="noopener noreferrer" className="ui-row-press flex min-h-12 items-center gap-2.5 py-2 no-underline">
                    <span className="min-w-0 flex-1">
                      <span className="block text-meta font-bold [overflow-wrap:anywhere]">{row.name}</span>
                      <span className="block text-caption text-ink-2">{row.org} · {row.every} · {row.terms}</span>
                    </span>
                    <span aria-hidden="true" className="text-brown-light">›</span>
                  </a>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        ))}
        <p className="text-caption text-ink-2">
          Plus {stationCount} National Weather Service weather stations (airports, mountain sensors and mesonets) matched to places by distance and elevation.
        </p>
        <CollapsibleSection title="How Bannquet reads them" subtitle="Things worth knowing" defaultOpen={false}>
          <ul className="list-disc space-y-1.5 pl-5 text-meta text-ink-2">
            {notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </CollapsibleSection>
      </div>
    </PageWrapper>
  );
}
