import { Mountain } from '@/types/weather';
import type { Category } from '@/components/adk-map/types';

export const REGIONS = ['ny', 'vt', 'nh', 'me'] as const;

export type RegionCode = typeof REGIONS[number];

export const REGION_LABELS: Record<RegionCode, string> = {
  ny: 'NY',
  vt: 'VT',
  nh: 'NH',
  me: 'ME',
};

export const DEFAULT_REGION: RegionCode = 'ny';

export const REGION_STORAGE_KEY = 'bnqt-active-region';

export const REGION_OPTIONS = REGIONS.map((code) => ({
  code,
  label: REGION_LABELS[code],
}));

export const isRegionCode = (value: string | null | undefined): value is RegionCode => {
  return !!value && REGIONS.includes(value as RegionCode);
};

export type MapRegionConfig = {
  center: [number, number];
  bounds: [[number, number], [number, number]];
  defaultStyle: string;
  enable3D?: boolean;
  categories?: Category[];
};

export const REGION_MAP_CONFIG: Record<RegionCode, MapRegionConfig> = {
  ny: {
    center: [-73.96, 44.127],
    bounds: [
      [-74.6, 43.85],
      [-73.5, 44.45],
    ],
    defaultStyle: 'mapbox://styles/mapbox/satellite-v9',
    enable3D: true,
  },
  vt: {
    center: [-72.7, 44.1],
    bounds: [
      [-73.5, 42.7],
      [-71.2, 45.3],
    ],
    defaultStyle: 'mapbox://styles/mapbox/outdoors-v12',
    enable3D: true,
  },
  nh: {
    center: [-71.35, 44.1],
    bounds: [
      [-72.5, 43.0],
      [-70.6, 45.4],
    ],
    defaultStyle: 'mapbox://styles/mapbox/outdoors-v12',
    enable3D: true,
  },
  me: {
    center: [-68.9, 45.4],
    bounds: [
      [-70.5, 44.0],
      [-67.0, 46.7],
    ],
    defaultStyle: 'mapbox://styles/mapbox/outdoors-v12',
    enable3D: true,
  },
};

export type WeatherSpotKind = 'summit' | 'town' | 'valley' | 'notch' | 'crag' | 'park';

export interface WeatherSpot extends Mountain {
  id: string;
  badge?: string;
  kind?: WeatherSpotKind;
}

export interface WeatherSection {
  id: string;
  title: string;
  description?: string;
  spots: WeatherSpot[];
  banner?: {
    label: string;
    href: string;
  };
}

export const REGION_WEATHER_SECTIONS: Record<RegionCode, WeatherSection[]> = {
  ny: [
    {
      id: 'ny-adirondacks',
      title: 'Adirondack High Peaks',
      description: 'Summit vs. valley to gauge true alpine swings.',
      spots: [
        {
          id: 'mt-marcy',
          name: 'Mount Marcy',
          region: 'High Peaks summit',
          lat: 44.1128,
          lon: -73.9237,
          elevation: 5344,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'keene-valley',
          name: 'Keene Valley',
          region: 'Valley floor',
          lat: 44.1962,
          lon: -73.7871,
          elevation: 1030,
          badge: 'Valley',
          kind: 'valley',
        },
      ],
    },
    {
      id: 'ny-catskills',
      title: 'Catskill Mountains',
      description: 'Hunter summit paired with the Tannersville base.',
      spots: [
        {
          id: 'hunter-mountain',
          name: 'Hunter Mountain',
          region: 'Catskills summit',
          lat: 42.202,
          lon: -74.2132,
          elevation: 4040,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'tannersville',
          name: 'Tannersville',
          region: 'Village weather',
          lat: 42.1959,
          lon: -74.1307,
          elevation: 1900,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
    {
      id: 'ny-gunks',
      title: 'Shawangunks',
      description: 'Crag conditions for the ridge.',
      spots: [
        {
          id: 'shawangunk-ridge',
          name: 'Gunks Ridge',
          region: 'Shawangunk escarpment',
          lat: 41.7361,
          lon: -74.2361,
          elevation: 2240,
          badge: 'Crag',
          kind: 'crag',
        },
      ],
    },
    {
      id: 'ny-thacher',
      title: 'Thacher Park',
      description: 'Albany crag & trail weather.',
      spots: [
        {
          id: 'thacher-park',
          name: 'Thacher State Park',
          region: 'Helderberg Escarpment',
          lat: 42.652,
          lon: -74.0083,
          elevation: 1300,
          badge: 'Park',
          kind: 'park',
        },
      ],
    },
  ],
  vt: [
    {
      id: 'vt-jay',
      title: 'Jay Peak',
      description: 'Summit winds vs. the Jay village weather.',
      spots: [
        {
          id: 'jay-peak',
          name: 'Jay Peak',
          region: 'Northern spine',
          lat: 44.9239,
          lon: -72.5316,
          elevation: 3858,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'jay-village',
          name: 'Jay Village',
          region: 'Valley base',
          lat: 44.9376,
          lon: -72.4512,
          elevation: 1100,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
    {
      id: 'vt-north-greens',
      title: 'Northern Greens',
      description: 'Mansfield summit with Stowe town conditions.',
      spots: [
        {
          id: 'mt-mansfield',
          name: 'Mount Mansfield',
          region: 'Ridgeline summit',
          lat: 44.5439,
          lon: -72.8151,
          elevation: 4393,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'stowe-town',
          name: 'Stowe',
          region: 'Village weather',
          lat: 44.4654,
          lon: -72.6874,
          elevation: 1040,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
    {
      id: 'vt-central-greens',
      title: 'Central Greens',
      description: 'Camel’s Hump paired with Bolton/Waterbury.',
      spots: [
        {
          id: 'camels-hump',
          name: "Camel's Hump",
          region: 'Spine summit',
          lat: 44.3194,
          lon: -72.8853,
          elevation: 4081,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'waterbury',
          name: 'Bolton / Waterbury',
          region: 'Climbing base',
          lat: 44.337,
          lon: -72.7562,
          elevation: 600,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
    {
      id: 'vt-south-greens',
      title: 'Southern Greens',
      description: 'Killington ridgeline plus Manchester weather.',
      spots: [
        {
          id: 'killington-peak',
          name: 'Killington Peak',
          region: 'Killington summit',
          lat: 43.6045,
          lon: -72.8205,
          elevation: 4241,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'manchester-vt',
          name: 'Manchester',
          region: 'Valley weather',
          lat: 43.1638,
          lon: -73.0729,
          elevation: 900,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
  ],
  nh: [
    {
      id: 'nh-presidential-range',
      title: 'Presidential Range',
      description: 'Mount Washington summit vs. Pinkham Notch base.',
      banner: {
        label: 'Higher Summits Forecast',
        href: 'https://mountwashington.org/weather/higher-summits-forecast/',
      },
      spots: [
        {
          id: 'mt-washington',
          name: 'Mount Washington',
          region: 'Presidential summit',
          lat: 44.2706,
          lon: -71.3033,
          elevation: 6288,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'pinkham-notch',
          name: 'Pinkham Notch',
          region: 'AMC base camp',
          lat: 44.2556,
          lon: -71.2512,
          elevation: 2017,
          badge: 'Notch',
          kind: 'notch',
        },
      ],
    },
    {
      id: 'nh-franconia',
      title: 'Franconia & Pemi',
      description: 'Lafayette ridge linked with Franconia Notch.',
      spots: [
        {
          id: 'mt-lafayette',
          name: 'Mount Lafayette',
          region: 'Franconia ridge',
          lat: 44.1606,
          lon: -71.645,
          elevation: 5249,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'franconia-notch',
          name: 'Franconia Notch',
          region: 'Notch weather',
          lat: 44.1489,
          lon: -71.6826,
          elevation: 1940,
          badge: 'Notch',
          kind: 'notch',
        },
      ],
    },
    {
      id: 'nh-rumney',
      title: 'Rumney Climbing',
      description: 'Crag conditions for Rumney / Plymouth.',
      spots: [
        {
          id: 'rumney-crag',
          name: 'Rumney Crags',
          region: 'Baker River valley',
          lat: 43.8098,
          lon: -71.8126,
          elevation: 1400,
          badge: 'Crag',
          kind: 'crag',
        },
      ],
    },
  ],
  me: [
    {
      id: 'me-baxter',
      title: 'Baxter State Park',
      description: 'Katahdin summit with Millinocket conditions.',
      spots: [
        {
          id: 'katahdin',
          name: 'Mount Katahdin',
          region: 'Baxter summit',
          lat: 45.9044,
          lon: -68.9217,
          elevation: 5268,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'millinocket',
          name: 'Millinocket',
          region: 'Gateway town',
          lat: 45.657,
          lon: -68.7098,
          elevation: 400,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
    {
      id: 'me-mahoosuc',
      title: 'Mahoosucs & Bigelow',
      description: 'Bigelow ridge plus Rangeley town weather.',
      spots: [
        {
          id: 'bigelow',
          name: 'Bigelow Mountain',
          region: 'High peaks',
          lat: 45.1634,
          lon: -70.3009,
          elevation: 4150,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'rangeley',
          name: 'Rangeley',
          region: 'Lakes region',
          lat: 44.9917,
          lon: -70.6645,
          elevation: 1518,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
    {
      id: 'me-acadia',
      title: 'Acadia',
      description: 'Cadillac Mountain paired with Bar Harbor.',
      spots: [
        {
          id: 'cadillac-mountain',
          name: 'Cadillac Mountain',
          region: 'Acadia summit',
          lat: 44.3516,
          lon: -68.2221,
          elevation: 1530,
          badge: 'Summit',
          kind: 'summit',
        },
        {
          id: 'bar-harbor',
          name: 'Bar Harbor',
          region: 'Coastal town',
          lat: 44.3876,
          lon: -68.2039,
          elevation: 150,
          badge: 'Town',
          kind: 'town',
        },
      ],
    },
  ],
};

export const getRegionWeatherSections = (region: RegionCode): WeatherSection[] => {
  return REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
};

export const getRegionWeatherSpots = (region: RegionCode): WeatherSpot[] => {
  return getRegionWeatherSections(region).flatMap((section) => section.spots);
};

