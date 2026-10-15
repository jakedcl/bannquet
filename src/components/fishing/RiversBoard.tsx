'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';
import { FISHING_REGIONS } from '@/lib/fishing/gauges';
import type { ParkingArea } from '@/lib/fishing/pfr';
import { formatAge, formatEastern, parseGaugeNumber, type FieldState, type GaugeView } from '@/lib/fishing/readings';

const FishingMap = dynamic(() => import('@/components/fishing/FishingMap'), {
  ssr: false,
  loading: () => <p className="text-sm">Loading the map.</p>,
});

function blank(state: FieldState): string {
  return state === 'not-measured' ? 'Not measured' : 'No current reading';
}

function reading(state: FieldState, value: string | null, note: string | null) {
  if (state !== 'value' || !value) return <span className="text-gray-700">{blank(state)}</span>;
  return (
    <span>
      {value}
      {note ? <span className="mt-1 block text-xs text-gray-700">{note}</span> : null}
    </span>
  );
}

function updated(iso: string | null, now: number): string {
  if (!iso) return '';
  const age = formatAge(iso, now);
  const clock = formatEastern(iso);
  if (age && clock) return `${age} · ${clock}`;
  return clock ?? age ?? '';
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
  selected,
  now,
  forecast,
}: {
  gauges: GaugeView[];
  gaugesUnavailable?: boolean;
  parking: ParkingArea[];
  parkingError: string | null;
  parkingTruncated: boolean;
  selected: string | null;
  now: number;
  forecast: ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [parkingQuery, setParkingQuery] = useState('');
  const [county, setCounty] = useState('all');
  const [showParking, setShowParking] = useState(true);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return gauges.filter((gauge) => {
      if (region !== 'all' && gauge.region !== region) return false;
      if (!needle) return true;
      return [gauge.name, gauge.county, gauge.state, gauge.region, gauge.site].some((value) =>
        value?.toLowerCase().includes(needle),
      );
    });
  }, [gauges, query, region]);

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

  function select(site: string) {
    router.push(site === selected ? '/fishing' : `/fishing?site=${site}`, { scroll: false });
  }

  const columns: DataColumn<GaugeView>[] = [
    {
      id: 'name',
      header: 'River',
      sticky: true,
      sortValue: (gauge) => gauge.name,
      cell: (gauge) => (
        <span>
          <button type="button" onClick={() => select(gauge.site)} className="text-left font-bold underline">
            {gauge.name}
          </button>
          {selected === gauge.site ? <span className="mt-1 block text-xs font-bold uppercase">Selected</span> : null}
          <a href={gauge.usgsHref} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs underline">
            USGS
          </a>
        </span>
      ),
    },
    {
      id: 'region',
      header: 'Region',
      sortValue: (gauge) => gauge.region,
      cell: (gauge) => gauge.county ? `${gauge.region} · ${gauge.county}` : gauge.region,
    },
    {
      id: 'flow',
      header: 'Flow (cfs)',
      align: 'right',
      sortValue: (gauge) => gauge.flowState === 'value' ? leadingNumber(gauge.flow) : null,
      cell: (gauge) => reading(gauge.flowState, gauge.flow, gauge.flowNote),
    },
    {
      id: 'trend',
      header: '24h',
      align: 'right',
      sortValue: (gauge) => leadingNumber(gauge.trend),
      cell: (gauge) => gauge.trend ?? '—',
    },
    {
      id: 'height',
      header: 'Gauge height',
      align: 'right',
      sortValue: (gauge) => gauge.heightState === 'value' ? leadingNumber(gauge.height) : null,
      cell: (gauge) => reading(gauge.heightState, gauge.height, gauge.heightNote),
    },
    {
      id: 'temp',
      header: 'Water temp',
      sortValue: (gauge) => gauge.tempState === 'value' ? leadingNumber(gauge.temp) : null,
      cell: (gauge) => reading(gauge.tempState, gauge.temp, gauge.tempNote),
    },
    {
      id: 'updated',
      header: 'Updated',
      sortValue: (gauge) => gauge.updatedAt ? Date.parse(gauge.updatedAt) : null,
      cell: (gauge) => updated(gauge.updatedAt, now) || '—',
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (gauge) => gauge.status,
      cell: (gauge) => gauge.status ?? '',
    },
  ];

  const parkingColumns: DataColumn<ParkingArea>[] = [
    { id: 'water', header: 'Water', sticky: true, sortValue: (area) => area.water, cell: (area) => area.water },
    { id: 'town', header: 'Town', sortValue: (area) => area.town, cell: (area) => area.town ?? '' },
    { id: 'county', header: 'County', sortValue: (area) => area.county, cell: (area) => area.county ?? '' },
    { id: 'road', header: 'Road', sortValue: (area) => area.road, cell: (area) => area.road ?? '' },
    { id: 'stocked', header: 'Stocked', sortValue: (area) => area.stocked, cell: (area) => area.stocked ?? '' },
    { id: 'trout', header: 'Trout present', sortValue: (area) => area.troutPresent, cell: (area) => area.troutPresent ?? '' },
    {
      id: 'links',
      header: 'Links',
      sortValue: () => null,
      cell: (area) => (
        <span>
          {area.mapHref ? (
            <a href={area.mapHref} target="_blank" rel="noopener noreferrer" className="block underline">PDF map</a>
          ) : null}
          {area.rulesHref ? (
            <a href={area.rulesHref} target="_blank" rel="noopener noreferrer" className="block underline">Special regulations</a>
          ) : null}
        </span>
      ),
    },
  ];

  const gaugeFiltered = query.trim().length > 0 || region !== 'all';
  const parkingFiltered = parkingQuery.trim().length > 0 || county !== 'all';

  return (
    <div className="space-y-4">
      {forecast ? <div key="forecast">{forecast}</div> : null}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase">Map</p>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={showParking} onChange={(event) => setShowParking(event.target.checked)} />
            Public fishing rights parking
          </label>
        </div>
        <div className="retro-box-inset bg-white">
          <FishingMap
            gauges={shown}
            parking={showParking ? parkingShown : []}
            selected={selected}
            showParking={showParking}
            onSelect={select}
          />
        </div>
        <p className="text-xs text-gray-700">
          Green pins are USGS gauges. Brown pins are NY public fishing rights parking in Catskill and Adirondack counties.
        </p>
        {parkingError ? <p className="text-sm font-bold">{parkingError}</p> : null}
        {parkingTruncated ? (
          <p className="text-sm font-bold">The parking list hit the request limit, so it may be incomplete.</p>
        ) : null}
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="River or gauge" />
      <FilterPills
        label="Region"
        value={region}
        options={[{ id: 'all', label: 'All' }, ...FISHING_REGIONS.map((item) => ({ id: item, label: item }))]}
        onChange={setRegion}
      />
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(gauge) => gauge.site}
        empty={gaugesUnavailable ? 'Data unavailable' : gaugeFiltered ? 'No gauges match.' : 'No gauges came back.'}
        onRowClick={(gauge) => select(gauge.site)}
        defaultSort={{ id: 'name', dir: 'asc' }}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase">Public fishing rights parking</h2>
        <p className="text-sm text-gray-700">
          NY DEC parking areas in Catskill and Adirondack counties, from data.ny.gov. Vermont, New Hampshire, and Maine are not in this file.
        </p>
        {parkingError ? null : parking.length === 0 ? (
          <p className="text-sm">No parking areas came back for those counties.</p>
        ) : (
          <>
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
              empty={parkingFiltered ? 'No parking areas match.' : 'No parking areas came back for those counties.'}
              defaultSort={{ id: 'water', dir: 'asc' }}
            />
          </>
        )}
      </div>
    </div>
  );
}
