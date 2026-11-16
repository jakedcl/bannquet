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
      header: 'Measured at',
      sortValue: (row) => row.stationId ?? '',
      cell: (row) => row.stationId ? (
        <span>
          <strong>{row.stationName ?? row.stationId} ({row.stationId})</strong>
          <span className="block text-xs text-gray-700">
            {row.stationKind === 'summit' ? 'Summit station' : row.stationKind === 'valley' ? 'Nearby valley station' : row.stationKind === 'nearby-higher' ? 'Nearby higher station' : 'Nearby station'}
            {row.stationDistanceMi != null ? ` · ${row.stationDistanceMi.toFixed(1)} mi away` : ''}
            {row.stationElevationFt != null ? ` · ${row.stationElevationFt.toLocaleString('en-US')} ft station` : ' · elevation unknown'}
            {row.elevationDiffFt != null ? ` · ${Math.abs(row.elevationDiffFt).toLocaleString('en-US')} ft ${row.elevationDiffFt >= 0 ? 'below' : 'above'} place` : ''}
          </span>
        </span>
      ) : '—',
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
        row.windGust != null && row.windGust > row.windSpeed
          ? `${row.windSpeed} mph · gust ${row.windGust}`
          : `${row.windSpeed} mph`,
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
