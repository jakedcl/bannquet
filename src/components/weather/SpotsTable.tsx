'use client';

import { BrowseTable } from '@/components/ui/BrowseTable';
import type { DataColumn } from '@/components/ui/DataTable';
import type { ExtremeSpot } from '@/lib/weather-extremes';

export function SpotsTable({ spots }: { spots: ExtremeSpot[] }) {
  const columns: DataColumn<ExtremeSpot>[] = [
    {
      id: 'spot',
      header: 'Spot',
      sticky: true,
      sortValue: (row) => row.mountain,
      cell: (row) => `${row.mountain}, ${row.state}`,
    },
    {
      id: 'station',
      header: 'Station',
      sortValue: (row) => row.stationId ?? '',
      cell: (row) => row.stationId ?? '—',
    },
    {
      id: 'age',
      header: 'Age',
      align: 'right',
      sortValue: (row) => row.ageMinutes ?? 99999,
      cell: (row) => (row.ageMinutes == null ? '—' : `${row.ageMinutes} min`),
    },
    {
      id: 'now',
      header: 'Temp',
      align: 'right',
      sortValue: (row) => row.temperature,
      cell: (row) => `${row.temperature}°F`,
    },
    {
      id: 'wind',
      header: 'Wind',
      align: 'right',
      sortValue: (row) => row.windSpeed,
      cell: (row) =>
        row.windGust > row.windSpeed ? `${row.windSpeed} mph · gust ${row.windGust}` : `${row.windSpeed} mph`,
    },
    {
      id: 'chill',
      header: 'Feels like',
      align: 'right',
      sortValue: (row) => row.windChill,
      cell: (row) => `${row.windChill}°F`,
    },
  ];

  return (
    <BrowseTable
      rows={spots}
      columns={columns}
      rowKey={(row) => `${row.mountain}-${row.state}`}
      empty="No spots came back."
      defaultSort={{ id: 'spot', dir: 'asc' }}
      placeholder="Spot or state"
      searchText={(row) => `${row.mountain} ${row.state} ${row.stationId ?? ''}`}
      facets={[{ id: 'state', label: 'State', value: (row) => row.state }]}
      collapsed
    />
  );
}