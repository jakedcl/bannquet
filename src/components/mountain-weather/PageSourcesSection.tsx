import Link from 'next/link';
import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { RECEIPT_DOT, RECEIPT_WORD, freshnessOf, receiptState, shortOrg, type ReceiptState } from '@/components/mountain-weather/kit';
import type { PageSourceRow, PageSourceTab, PageSources } from '@/lib/mountain-weather/page-sources';

const TAB_LABEL: Record<PageSourceTab, string> = {
  forecast: 'Forecast tab',
  measured: 'Measured tab',
  snow: 'Snow tab',
  maps: 'Maps tab',
  more: 'More tab',
};

type RowState = ReceiptState | 'empty';

function rowState(row: PageSourceRow): RowState {
  if (row.status === 'empty') return 'empty';
  return receiptState({ status: row.status, at: row.at, expectedEveryHours: row.expectedEveryHours });
}

const WORD: Record<RowState, string> = { ...RECEIPT_WORD, empty: 'Nothing published now' };
const DOT: Record<RowState, string> = { ...RECEIPT_DOT, empty: RECEIPT_DOT.off };

/**
 * Every source this place page reads, once, grouped by the tab that shows it, with a dot
 * for whether it is working right now; then the useful pages the site only links to.
 */
export function PageSourcesSection({ sources, tabHref }: { sources: PageSources; tabHref: (tab: PageSourceTab) => string }) {
  const counts = new Map<RowState, number>();
  for (const row of sources.rows) {
    const state = rowState(row);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  const summary = (['ok', 'late', 'error', 'off', 'empty'] as RowState[])
    .filter((state) => counts.get(state))
    .map((state) => `${counts.get(state)} ${WORD[state].toLowerCase()}`)
    .join(' · ');
  const tabs = (Object.keys(TAB_LABEL) as PageSourceTab[]).filter((tab) => sources.rows.some((row) => row.tab === tab));

  return (
    <CollapsibleSection title="Sources for this page" subtitle={summary || 'Every source this page reads'}>
      <p className="text-meta text-ink-2">
        Everything on this page comes from these sources. The dot shows whether each one is working right now. Tap a row to see the original.{' '}
        <Link href="/mountain-weather/sources" className="font-bold underline">All sources on Bannquet ›</Link>
      </p>
      <div className="mt-3 space-y-4">
        {tabs.map((tab) => (
          <section key={tab}>
            <h3 className="flex items-baseline justify-between text-tag font-bold uppercase tracking-label text-ink-2">
              {TAB_LABEL[tab]}
              <a href={tabHref(tab)} className="font-bold normal-case tracking-normal underline">Open ›</a>
            </h3>
            <ul className="ui-list mt-1">
              {sources.rows
                .filter((row) => row.tab === tab)
                .map((row) => {
                  const state = rowState(row);
                  const { ago } = freshnessOf(row.at);
                  return (
                    <li key={row.key}>
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ui-row-press flex min-h-12 items-center gap-2.5 py-2 no-underline"
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[state]}`} title={WORD[state]} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-meta font-bold [overflow-wrap:anywhere]">{row.name}</span>
                          <span className="block text-caption text-ink-2 [overflow-wrap:anywhere]">
                            {shortOrg(row.org)}
                            {row.product ? ` · ${row.product}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-caption text-ink-2">
                          {state === 'ok' && ago ? ago : WORD[state]}
                        </span>
                        <span aria-hidden="true" className="text-brown-light">›</span>
                      </a>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
        {sources.links.length ? (
          <section>
            <h3 className="text-tag font-bold uppercase tracking-label text-ink-2">Other useful links (not read by this page)</h3>
            <ul className="ui-list mt-1">
              {sources.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ui-row-press flex min-h-12 items-center gap-2.5 py-2 no-underline"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-meta font-bold [overflow-wrap:anywhere]">{link.label}</span>
                      <span className="block text-caption text-ink-2">{link.org}</span>
                    </span>
                    <span aria-hidden="true" className="text-brown-light">›</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}
