import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { RecordBrowser, type BrowserRow } from '@/components/fishing/RecordBrowser';
import { FISHING_STATE_LINKS } from '@/lib/fishing/guides';
import { stockingDateKey, type MaineStockingReport } from '@/lib/fishing/maine-stocking';
import { loadMaineStocking, loadPlannedStocking, type PlannedStockingLoad } from '@/lib/fishing/stocking';

export const dynamic = 'force-dynamic';

export default async function StockingPage() {
  const [plannedResult, maineResult] = await Promise.allSettled([loadPlannedStocking(), loadMaineStocking()]);
  const planned = plannedResult.status === 'fulfilled' ? plannedResult.value : null;
  const plannedError = plannedResult.status === 'rejected';
  const maine = maineResult.status === 'fulfilled' ? maineResult.value : null;
  const maineError = maineResult.status === 'rejected';
  if (plannedError) console.error('NY planned stocking did not load');
  if (maineError) console.error('Maine stocking did not load');

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <Window title="Stocking">
          <p className="mb-4 text-sm text-gray-700">
            New York&apos;s spring list is a plan. Maine&apos;s PDF is a preliminary record of stockings already entered.
            Vermont and New Hampshire are links only.
          </p>
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase">New York — planned</h2>
              <p className="text-sm text-gray-700">
                These rows are the current-season spring trout plan from NY DEC. A month or week in the table is the planned window, not a date the fish were stocked.
              </p>
              <StateLinks state="New York" />
              {plannedError ? <p className="text-sm font-bold">Data unavailable</p> : null}
              {planned ? <PlannedTable load={planned} /> : null}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase">Vermont</h2>
              <p className="text-sm text-gray-700">The schedule and search pages are not copied here.</p>
              <StateLinks state="Vermont" />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase">New Hampshire</h2>
              <p className="text-sm text-gray-700">The stocking report is not copied here.</p>
              <StateLinks state="New Hampshire" />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase">Maine</h2>
              <StateLinks state="Maine" />
              {maineError ? <p className="text-sm font-bold">Data unavailable</p> : null}
              {maine ? <MaineTable report={maine} /> : null}
            </section>
          </div>
        </Window>
      </div>
    </PageWrapper>
  );
}

function StateLinks({ state }: { state: string }) {
  const links = FISHING_STATE_LINKS.find((item) => item.state === state)?.stocking ?? [];
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-bold underline">
            {link.label}
          </a>
          <p className="text-sm text-gray-700">{link.note}</p>
        </li>
      ))}
    </ul>
  );
}

function PlannedTable({ load }: { load: PlannedStockingLoad }) {
  const rows: BrowserRow[] = load.rows.map((row, index) => ({
    id: `${row.county ?? ''}-${row.waterbody}-${row.species ?? ''}-${row.window ?? ''}-${index}`,
    county: row.county ?? '',
    search: [row.waterbody, row.town, row.county, row.species, row.window, row.year].filter(Boolean).join(' '),
    cells: [
      row.waterbody,
      row.county ?? '',
      row.town ?? '',
      row.year ?? '',
      row.window ?? '',
      row.species ?? '',
      row.number ?? '',
      row.size ?? '',
    ],
  }));

  return (
    <div className="space-y-3">
      {load.truncated ? (
        <p className="text-sm font-bold">This list hit the request limit, so it may be incomplete. Use the data.ny.gov link for the full plan.</p>
      ) : null}
      <RecordBrowser
        rows={rows}
        empty="NY DEC returned no planned stockings for the Catskill and Adirondack counties."
        placeholder="Water or town"
        headers={['Water', 'County', 'Town', 'Year', 'Planned window', 'Species', 'Number', 'Size']}
      />
    </div>
  );
}

function MaineTable({ report }: { report: MaineStockingReport }) {
  const rows: BrowserRow[] = [...report.rows]
    .sort((a, b) => stockingDateKey(b.date) - stockingDateKey(a.date) || a.water.localeCompare(b.water))
    .map((row, index) => ({
      id: `${row.date}-${row.county}-${row.water}-${row.town}-${row.species}-${index}`,
      county: row.county,
      search: [row.water, row.town, row.county, row.species, row.date].join(' '),
      cells: [
        row.date,
        `${row.county} County`,
        row.water,
        row.town,
        row.species,
        row.quantity,
        `${row.sizeInches} in`,
      ],
      sort: [
        stockingDateKey(row.date),
        row.county,
        row.water,
        row.town,
        row.species,
        Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : null,
        Number.isFinite(Number(row.sizeInches)) ? Number(row.sizeInches) : null,
      ],
    }));

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        {report.preliminary ? 'Preliminary. ' : ''}
        {report.asOf ? `Maine IF&W marked this file correct to the best of their knowledge on ${report.asOf}.` : 'The file did not include an as-of date.'}
      </p>
      {report.skipped > 0 ? (
        <p className="text-sm font-bold">
          {report.skipped} {report.skipped === 1 ? 'line was' : 'lines were'} left out because they did not match the report columns.
        </p>
      ) : null}
      <RecordBrowser
        rows={rows}
        empty="The Maine report parsed, but it had no stocking rows."
        placeholder="Water or town"
        headers={['Date', 'County', 'Water', 'Town', 'Species', 'Quantity', 'Size']}
        defaultSort={{ id: 'Date', dir: 'desc' }}
      />
    </div>
  );
}
