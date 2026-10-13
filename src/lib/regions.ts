import weatherRegions from '../../config/weather-regions.json';
import { OPENFREEMAP_STYLE_URL } from '@/lib/map';
import { Mountain } from '@/types/weather';

const SPOT_KINDS = ['summit', 'town', 'valley', 'notch', 'crag', 'park'] as const;
const BUTTON_TONES = ['default', 'yellow', 'orange', 'pink', 'blue', 'green', 'purple'] as const;

export type WeatherSpotKind = (typeof SPOT_KINDS)[number];
export type ButtonTone = (typeof BUTTON_TONES)[number];

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

export type MapRegionConfig = {
  center: [number, number];
  bounds: [[number, number], [number, number]];
  style: string;
};

export type RegionCode = string;

type RegionConfig = {
  code: string;
  label: string;
  buttonTone: ButtonTone;
  map: MapRegionConfig;
  sections: WeatherSection[];
};

function isSpotKind(value: unknown): value is WeatherSpotKind {
  return typeof value === 'string' && (SPOT_KINDS as readonly string[]).includes(value);
}

function isButtonTone(value: unknown): value is ButtonTone {
  return typeof value === 'string' && (BUTTON_TONES as readonly string[]).includes(value);
}

function readPair(value: unknown, label: string): [number, number] {
  if (!Array.isArray(value) || value.length !== 2 || value.some((item) => typeof item !== 'number')) {
    throw new Error(`Weather region config: ${label} must be a [lon, lat] pair`);
  }
  return [value[0], value[1]];
}

function loadRegions(raw: unknown): { defaultRegion: string; regions: RegionConfig[] } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Weather region config must be an object');
  }
  const config = raw as {
    defaultRegion?: unknown;
    mapStyle?: unknown;
    regions?: unknown;
  };
  if (!Array.isArray(config.regions) || config.regions.length === 0) {
    throw new Error('Weather region config needs at least one region');
  }

  const mapStyle = typeof config.mapStyle === 'string' && config.mapStyle.length > 0
    ? config.mapStyle
    : OPENFREEMAP_STYLE_URL;

  const regions: RegionConfig[] = config.regions.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Weather region ${index} is not an object`);
    }
    const region = entry as Record<string, unknown>;
    if (typeof region.code !== 'string' || typeof region.label !== 'string') {
      throw new Error(`Weather region ${index} needs a code and label`);
    }
    if (!isButtonTone(region.buttonTone)) {
      throw new Error(`Weather region ${region.code} has an unknown buttonTone`);
    }
    const map = region.map as { center?: unknown; bounds?: unknown } | undefined;
    if (!map || !Array.isArray(map.bounds) || map.bounds.length !== 2) {
      throw new Error(`Weather region ${region.code} needs map.center and map.bounds`);
    }
    if (!Array.isArray(region.sections)) {
      throw new Error(`Weather region ${region.code} needs sections`);
    }

    const sections: WeatherSection[] = region.sections.map((sectionEntry) => {
      const section = sectionEntry as Record<string, unknown>;
      if (typeof section.id !== 'string' || typeof section.title !== 'string' || !Array.isArray(section.spots)) {
        throw new Error(`Weather region ${region.code} has a section missing id, title, or spots`);
      }
      const spots: WeatherSpot[] = section.spots.map((spotEntry) => {
        const spot = spotEntry as Record<string, unknown>;
        const id = spot.id;
        const name = spot.name;
        const lat = spot.lat;
        const lon = spot.lon;
        const elevation = spot.elevation;
        const spotRegion = spot.region;
        const badge = spot.badge;
        const kind = spot.kind;
        if (
          typeof id !== 'string' ||
          typeof name !== 'string' ||
          typeof lat !== 'number' ||
          typeof lon !== 'number' ||
          typeof elevation !== 'number'
        ) {
          throw new Error(`Spot in ${region.code}/${section.id} needs id, name, lat, lon, and elevation`);
        }
        const label = region.label;
        if (typeof label !== 'string') {
          throw new Error(`Weather region ${region.code} needs a label`);
        }
        return {
          id,
          name,
          region: typeof spotRegion === 'string' ? spotRegion : label,
          lat,
          lon,
          elevation,
          badge: typeof badge === 'string' ? badge : undefined,
          kind: isSpotKind(kind) ? kind : undefined,
        };
      });

      const banner = section.banner as { label?: unknown; href?: unknown } | undefined;
      return {
        id: section.id,
        title: section.title,
        description: typeof section.description === 'string' ? section.description : undefined,
        spots,
        banner:
          banner && typeof banner.label === 'string' && typeof banner.href === 'string'
            ? { label: banner.label, href: banner.href }
            : undefined,
      };
    });

    return {
      code: region.code,
      label: region.label,
      buttonTone: region.buttonTone,
      map: {
        center: readPair(map.center, `${region.code} center`),
        bounds: [readPair(map.bounds[0], `${region.code} bounds[0]`), readPair(map.bounds[1], `${region.code} bounds[1]`)],
        style: mapStyle,
      },
      sections,
    };
  });

  const codes = new Set<string>();
  for (const region of regions) {
    if (codes.has(region.code)) {
      throw new Error(`Duplicate weather region code: ${region.code}`);
    }
    codes.add(region.code);
  }

  const defaultRegion = typeof config.defaultRegion === 'string' ? config.defaultRegion : regions[0].code;
  if (!codes.has(defaultRegion)) {
    throw new Error(`defaultRegion "${defaultRegion}" is not in the weather region list`);
  }

  return { defaultRegion, regions };
}

const loaded = loadRegions(weatherRegions);

export const REGIONS: RegionCode[] = loaded.regions.map((region) => region.code);
export const DEFAULT_REGION: RegionCode = loaded.defaultRegion;
export const REGION_STORAGE_KEY = 'bnqt-active-region';

export const REGION_LABELS: Record<string, string> = Object.fromEntries(
  loaded.regions.map((region) => [region.code, region.label]),
);

export const REGION_OPTIONS = loaded.regions.map((region) => ({
  code: region.code,
  label: region.label,
  buttonTone: region.buttonTone,
}));

export const REGION_MAP_CONFIG: Record<string, MapRegionConfig> = Object.fromEntries(
  loaded.regions.map((region) => [region.code, region.map]),
);

export const REGION_WEATHER_SECTIONS: Record<string, WeatherSection[]> = Object.fromEntries(
  loaded.regions.map((region) => [region.code, region.sections]),
);

export const isRegionCode = (value: string | null | undefined): value is RegionCode => {
  return !!value && REGIONS.includes(value);
};

export const getRegionWeatherSections = (region: RegionCode): WeatherSection[] => {
  return REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
};

export const getRegionWeatherSpots = (region: RegionCode): WeatherSpot[] => {
  return getRegionWeatherSections(region).flatMap((section) => section.spots);
};
