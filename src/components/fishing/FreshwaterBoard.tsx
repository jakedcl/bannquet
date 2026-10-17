'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';
import type { FreshwaterRow } from '@/lib/fishing/freshwater-rows';
import type { ParkingArea } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';

const FishingMap = dynamic(() => import('@/components/fishing/FishingMap'), {
  ssr: false,
  loading: () => <p className="text-sm">Loading the map.</p>,
});

function line(value: string) {
  return <span className="block max-w-xs truncate" title={value}>{value}</span>;
}

export function FreshwaterBoard({
  rows,
  gauges,
  parking,
  parkingError,
  parkingTruncated,
}: {
  rows: FreshwaterRow[];
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

  const columns: DataColumn<FreshwaterRow>[] = [
    {
      id: 'name',
      header: 'Water',
      sticky: true,
      sortValue: (row) => row.name,
      cell: (row) => {
        if (row.href && row.external) {
          return (
            <a href={row.href} target="_blank" rel="noopener noreferrer" className="font-bold underline" title={row.name}>
              {row.name}
            </a>
          );
        }
        if (row.href) {
          return (
            <Link href={row.href} className="font-bold underline" title={row.name}>
              {row.name}
            </Link>
          );
        }
        return <span className="font-bold" title={row.name}>{row.name}</span>;
      },
    },
    { id: 'state', header: 'State', sortValue: (row) => row.stateLabel, cell: (row) => row.stateLabel },
    { id: 'kind', header: 'Type', sortValue: (row) => row.kind, cell: (row) => row.kind },
    { id: 'detail', header: 'Detail', sortValue: (row) => row.detail, cell: (row) => line(row.detail) },
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
