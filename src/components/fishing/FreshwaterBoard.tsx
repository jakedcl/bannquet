'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';
import type { FreshwaterLayout, FreshwaterRow } from '@/lib/fishing/freshwater-rows';
import type { ParkingArea } from '@/lib/fishing/pfr';
import type { FieldState, GaugeView } from '@/lib/fishing/readings';

const FishingMap = dynamic(() => import('@/components/fishing/FishingMap'), {
  ssr: false,
  loading: () => <p className="text-sm">Loading the map.</p>,
});

const DASH = '—';

function line(value: string | null) {
  if (!value) return DASH;
  return <span className="block max-w-xs truncate" title={value}>{value}</span>;
}

function reading(state: FieldState | null, value: string | null) {
  if (state === 'value' && value) return <span className="whitespace-nowrap">{value}</span>;
  return state === 'not-measured' ? 'Not measured' : 'No current reading';
}

function waterName(row: FreshwaterRow, linked: boolean) {
  const name = linked && row.href
    ? row.external
      ? <a href={row.href} target="_blank" rel="noopener noreferrer" className="font-bold underline" title={row.name}>{row.name}</a>
      : <Link href={row.href} className="font-bold underline" title={row.name}>{row.name}</Link>
    : <span className="font-bold" title={row.name}>{row.name}</span>;
  if (!linked || !row.usgsHref) return name;
  return (
    <span className="inline-flex max-w-full items-baseline gap-2">
      {name}
      <a href={row.usgsHref} target="_blank" rel="noopener noreferrer" className="shrink-0 whitespace-nowrap text-xs underline">USGS</a>
    </span>
  );
}

function linkCell(row: FreshwaterRow) {
  if (!row.href) return DASH;
  const label = row.external ? 'Site' : 'Page';
  return row.external
    ? <a href={row.href} target="_blank" rel="noopener noreferrer" className="underline" title={row.href}>{label}</a>
    : <Link href={row.href} className="underline">{label}</Link>;
}

export function FreshwaterBoard({
  rows,
  layout,
  gauges,
  parking,
  parkingError,
  parkingTruncated,
}: {
  rows: FreshwaterRow[];
  layout: FreshwaterLayout;
  gauges: GaugeView[];
  parking: ParkingArea[];
  parkingError: string | null;
  parkingTruncated: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showParking, setShowParking] = useState(false);
  const [parkingQuery, setParkingQuery] = useState('');
  const [county, setCounty] = useState('all');

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.search.includes(needle));
  }, [query, rows]);

  const mapGauges = useMemo(() => {
    const sites = new Set(shown.flatMap((row) => (row.site ? [row.site] : [])));
    return gauges.filter((gauge) => sites.has(gauge.site));
  }, [gauges, shown]);

  const counties = useMemo(
    () => [...new Set(parking.flatMap((area) => (area.county ? [area.county] : [])))].sort((a, b) => a.localeCompare(b)),
    [parking],
  );

  const parkingShown = useMemo(() => {
    const needle = parkingQuery.trim().toLowerCase();
    return parking.filter((area) => {
      if (county !== 'all' && area.county !== county) return false;
      if (!needle) return true;
      return [area.water, area.town, area.county, area.road, area.stocked, area.troutPresent].some((value) =>
        value?.toLowerCase().includes(needle),
      );
    });
  }, [county, parking, parkingQuery]);

  const nameColumn = (header: string, linked: boolean): DataColumn<FreshwaterRow> => ({
    id: 'name',
    header,
    sticky: true,
    sortValue: (row) => row.name,
    cell: (row) => waterName(row, linked),
  });
  const columns: DataColumn<FreshwaterRow>[] = layout === 'summary'
    ? [
      nameColumn('Water', false),
      { id: 'state', header: 'State', sortValue: (row) => row.stateLabel, cell: (row) => row.stateLabel },
      { id: 'kind', header: 'Type', sortValue: (row) => row.kind, cell: (row) => row.kind },
      { id: 'status', header: 'Status', sortValue: (row) => row.status, cell: (row) => line(row.status) },
      { id: 'link', header: 'Link', sortValue: (row) => (row.href ? (row.external ? 'Site' : 'Page') : null), cell: linkCell },
    ]
    : layout === 'River'
      ? [
        nameColumn('River', true),
        { id: 'flow', header: 'Flow (cfs)', align: 'right', sortValue: (row) => row.flowSort, cell: (row) => reading(row.flowState, row.flow) },
        { id: 'temp', header: 'Water', sortValue: (row) => row.temp, cell: (row) => reading(row.tempState, row.temp) },
        { id: 'verdict', header: 'Verdict', sortValue: (row) => row.verdict, cell: (row) => line(row.verdict) },
      ]
      : layout === 'Lake'
        ? [
          nameColumn('Water', true),
          { id: 'county', header: 'County', sortValue: (row) => row.county, cell: (row) => line(row.county) },
          { id: 'species', header: 'Species', sortValue: (row) => row.species, cell: (row) => line(row.species) },
          { id: 'launch', header: 'Launch', sortValue: (row) => row.launch, cell: (row) => line(row.launch) },
        ]
        : [
          nameColumn('Water', true),
          { id: 'when', header: 'When', sortValue: (row) => row.when, cell: (row) => line(row.when) },
          { id: 'species', header: 'Species', sortValue: (row) => row.species, cell: (row) => line(row.species) },
          { id: 'number', header: 'Number', align: 'right', sortValue: (row) => row.numberSort, cell: (row) => row.number || DASH },
        ];

  const parkingColumns: DataColumn<ParkingArea>[] = [
    {
      id: 'water',
      header: 'Water',
      sticky: true,
      sortValue: (area) => area.water,
      cell: (area) => <span className="block truncate font-bold" title={area.water}>{area.water}</span>,
    },
    { id: 'town', header: 'Town', sortValue: (area) => area.town, cell: (area) => line(area.town ?? '—') },
    { id: 'county', header: 'County', sortValue: (area) => area.county, cell: (area) => line(area.county ?? '—') },
    { id: 'road', header: 'Road', sortValue: (area) => area.road, cell: (area) => line(area.road ?? '—') },
    {
      id: 'links',
      header: 'Links',
      sortValue: () => null,
      cell: (area) => (
        <span className="whitespace-nowrap">
          {area.mapHref ? <a href={area.mapHref} target="_blank" rel="noopener noreferrer" className="underline">Map</a> : null}
          {area.mapHref && area.rulesHref ? ' · ' : null}
          {area.rulesHref ? <a href={area.rulesHref} target="_blank" rel="noopener noreferrer" className="underline">Rules</a> : null}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {gauges.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase">Map</p>
            {parking.length > 0 ? (
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={showParking} onChange={(event) => setShowParking(event.target.checked)} />
                Angler parking
              </label>
            ) : null}
          </div>
          <div className="retro-box-inset bg-white">
            <FishingMap
              gauges={mapGauges}
              parking={showParking ? parkingShown : []}
              showParking={showParking && parking.length > 0}
              onSelect={(site) => router.push(`/fishing/${site}`)}
            />
          </div>
          <p className="text-xs text-gray-700">
            {parking.length > 0 ? 'Green pins are gauges. Brown pins are angler parking.' : 'Green pins are gauges.'}
          </p>
          {parkingError ? <p className="text-sm font-bold">{parkingError}</p> : null}
          {parkingTruncated ? <p className="text-sm font-bold">The parking list hit the request limit, so it may be incomplete.</p> : null}
        </div>
      ) : null}

      <SearchBar value={query} onChange={setQuery} placeholder="Water, state, or species" />
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(row) => row.id}
        empty={query.trim() ? 'Nothing matches.' : 'Nothing listed for this filter.'}
        defaultSort={{ id: 'name', dir: 'asc' }}
        collapsed
      />

      {parking.length > 0 ? (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-bold uppercase">Angler parking</summary>
          <SearchBar value={parkingQuery} onChange={setParkingQuery} placeholder="Water or town" label="Search parking" />
          {counties.length > 1 ? (
            <FilterPills
              label="County"
              value={county}
              options={[{ id: 'all', label: 'All' }, ...counties.map((item) => ({ id: item, label: item }))]}
              onChange={setCounty}
            />
          ) : null}
          <DataTable
            rows={parkingShown}
            columns={parkingColumns}
            rowKey={(area) => area.id}
            empty={parkingQuery.trim() || county !== 'all' ? 'No parking areas match.' : 'No parking areas came back.'}
            defaultSort={{ id: 'water', dir: 'asc' }}
            collapsed
          />
        </details>
      ) : null}
    </div>
  );
}
