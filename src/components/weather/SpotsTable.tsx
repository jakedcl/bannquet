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
      id: 'now',
      header: 'Now',
      align: 'right',
      sortValue: (row) => row.temperature,
      cell: (row) => `${row.temperature}°F`,
    },
    {
      id: 'low',
      header: 'Low',
      align: 'right',
      sortValue: (row) => row.minTemperature,
      cell: (row) => `${row.minTemperature}°F`,
    },
    {
      id: 'high',
      header: 'High',
      align: 'right',
      sortValue: (row) => row.maxTemperature,
      cell: (row) => `${row.maxTemperature}°F`,
    },
    {
      id: 'wind',
      header: 'Wind',
      align: 'right',
      sortValue: (row) => row.windSpeed,
      cell: (row) => `${row.windSpeed} mph`,
    },
    {
      id: 'chill',
      header: 'Wind chill',
      align: 'right',
      sortValue: (row) => row.windChill,
      cell: (row) => `${row.windChill}°F`,
    },
    {
      id: 'snow',
      header: 'Snow',
      sortValue: (row) => (row.isSnowing ? 1 : 0),
      cell: (row) => (row.isSnowing ? 'Yes' : 'No'),
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
      searchText={(row) => `${row.mountain} ${row.state}`}
      facets={[
        { id: 'state', label: 'State', value: (row) => row.state },
        { id: 'snow', label: 'Snow', value: (row) => (row.isSnowing ? 'Snowing' : 'Clear') },
      ]}
    />
  );
}
