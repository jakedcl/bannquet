'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';
import { FISHING_REGIONS } from '@/lib/fishing/gauges';
import type { ParkingArea } from '@/lib/fishing/pfr';
import { parseGaugeNumber, plainWaterName, type FieldState, type GaugeView } from '@/lib/fishing/readings';

const FishingMap = dynamic(() => import('@/components/fishing/FishingMap'), {
  ssr: false,
  loading: () => <p className="text-sm">Loading the map.</p>,
});

function blank(state: FieldState): string {
  return state === 'not-measured' ? 'Not measured' : 'No current reading';
}

function reading(state: FieldState, value: string | null, note: string | null) {
  const text = state === 'value' && value ? value : blank(state);
  return (
    <span className="whitespace-nowrap" title={note ?? undefined}>
      {text}
    </span>
  );
}

function line(value: string | null | undefined) {
  if (!value) return '';
  return <span className="whitespace-nowrap" title={value}>{value}</span>;
}

function leadingNumber(value: string | null): number | null {
  if (!value) return null;
  return parseGaugeNumber(value.split(' ')[0] ?? '');
}

export function RiversBoard({
  gauges,
  gaugesUnavailable = false,
  parking,
  parkingError,
  parkingTruncated,
}: {
  gauges: GaugeView[];
  gaugesUnavailable?: boolean;
  parking: ParkingArea[];
  parkingError: string | null;
  parkingTruncated: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [parkingQuery, setParkingQuery] = useState('');
  const [county, setCounty] = useState('all');
  const [showParking, setShowParking] = useState(false);

  const regions = useMemo(
    () => FISHING_REGIONS.filter((item) => gauges.some((gauge) => gauge.region === item)),
    [gauges],
  );
  const activeRegion = regions.some((item) => item === region) ? region : 'all';

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return gauges.filter((gauge) => {
      if (activeRegion !== 'all' && gauge.region !== activeRegion) return false;
      if (!needle) return true;
      return [gauge.name, gauge.county, gauge.state, gauge.region, gauge.site].some((value) =>
        value?.toLowerCase().includes(needle),
      );
    });
  }, [activeRegion, gauges, query]);

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

  function openSpot(site: string) {
    router.push(`/fishing/${site}`);
  }

  const columns: DataColumn<GaugeView>[] = [
    {
      id: 'name',
      header: 'River',
      sticky: true,
      sortValue: (gauge) => gauge.name,
      cell: (gauge) => (
        <span className="inline-flex max-w-full items-baseline gap-2">
          <Link href={`/fishing/${gauge.site}`} title={gauge.name} className="min-w-0 truncate text-left font-bold underline">
            {plainWaterName(gauge.name)}
          </Link>
          <a href={gauge.usgsHref} target="_blank" rel="noopener noreferrer" className="shrink-0 whitespace-nowrap text-xs underline">
            USGS
          </a>
        </span>
      ),
    },
    {
      id: 'flow',
      header: 'Flow (cfs)',
      align: 'right',
      sortValue: (gauge) => gauge.flowState === 'value' ? leadingNumber(gauge.flow) : null,
      cell: (gauge) => reading(gauge.flowState, gauge.flow, gauge.flowNote),
    },
    {
      id: 'temp',
      header: 'Water',
      sortValue: (gauge) => gauge.tempState === 'value' ? leadingNumber(gauge.temp) : null,
      cell: (gauge) => reading(gauge.tempState, gauge.temp, gauge.tempNote),
    },
    {
      id: 'verdict',
      header: 'Verdict',
      sortValue: (gauge) => gauge.verdict ?? null,
      cell: (gauge) => line(gauge.verdict ?? '—'),
    },
  ];

  const parkingColumns: DataColumn<ParkingArea>[] = [
    {
      id: 'water',
      header: 'Water',
      sticky: true,
      sortValue: (area) => area.water,
      cell: (area) => <span className="block truncate font-bold" title={area.water}>{area.water}</span>,
    },
    { id: 'town', header: 'Town', sortValue: (area) => area.town, cell: (area) => line(area.town) },
    { id: 'county', header: 'County', sortValue: (area) => area.county, cell: (area) => line(area.county) },
    { id: 'road', header: 'Road', sortValue: (area) => area.road, cell: (area) => line(area.road) },
    { id: 'stocked', header: 'Stocked', sortValue: (area) => area.stocked, cell: (area) => line(area.stocked) },
    { id: 'trout', header: 'Trout present', sortValue: (area) => area.troutPresent, cell: (area) => line(area.troutPresent) },
    {
      id: 'links',
      header: 'Links',
      sortValue: () => null,
      cell: (area) => (
        <span className="whitespace-nowrap">
          {area.mapHref ? (
            <a href={area.mapHref} target="_blank" rel="noopener noreferrer" className="underline">Map</a>
          ) : null}
          {area.mapHref && area.rulesHref ? ' · ' : null}
          {area.rulesHref ? (
            <a href={area.rulesHref} target="_blank" rel="noopener noreferrer" className="underline">Rules</a>
          ) : null}
        </span>
      ),
    },
  ];

  const gaugeFiltered = query.trim().length > 0 || activeRegion !== 'all';
  const parkingFiltered = parkingQuery.trim().length > 0 || county !== 'all';

  return (
    <div className="space-y-4">
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
            gauges={shown}
            parking={showParking ? parkingShown : []}
            showParking={showParking && parking.length > 0}
            onSelect={openSpot}
          />
        </div>
        <p className="text-xs text-gray-700">
          {parking.length > 0 ? 'Green pins are gauges. Brown pins are angler parking.' : 'Green pins are gauges.'}
        </p>
        {parkingError ? <p className="text-sm font-bold">{parkingError}</p> : null}
        {parkingTruncated ? (
          <p className="text-sm font-bold">The parking list hit the request limit, so it may be incomplete.</p>
        ) : null}
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="River or gauge" />
      {regions.length > 1 ? (
        <FilterPills
          label="Region"
          value={activeRegion}
          options={[{ id: 'all', label: 'All' }, ...regions.map((item) => ({ id: item, label: item }))]}
          onChange={setRegion}
        />
      ) : null}
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(gauge) => gauge.site}
        empty={gaugesUnavailable ? 'Data unavailable' : gaugeFiltered ? 'No gauges match.' : 'No gauges came back.'}
        onRowClick={(gauge) => openSpot(gauge.site)}
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
            empty={parkingFiltered ? 'No parking areas match.' : 'No parking areas came back.'}
            defaultSort={{ id: 'water', dir: 'asc' }}
            collapsed
          />
        </details>
      ) : null}
    </div>
  );
}
