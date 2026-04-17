import { NextResponse } from 'next/server';
import { getWeather } from '@/lib/weather';
import { REGION_WEATHER_SECTIONS, RegionCode } from '@/lib/regions';

type ExtremeStat = {
  mountain: string;
  state: string;
  value: number;
  unit: string;
};

export async function GET() {
  try {
    const allMountains: Array<{ name: string; state: string; lat: number; lon: number }> = [];
    
    // Collect all mountains from all regions
    const stateMap: Record<RegionCode, string> = {
      ny: 'NY',
      vt: 'VT',
      nh: 'NH',
      me: 'ME',
    };

    (Object.keys(REGION_WEATHER_SECTIONS) as RegionCode[]).forEach(region => {
      const sections = REGION_WEATHER_SECTIONS[region];
      sections.forEach(section => {
        section.spots.forEach(spot => {
          allMountains.push({
            name: spot.name,
            state: stateMap[region] || region.toUpperCase(),
            lat: spot.lat,
            lon: spot.lon,
          });
        });
      });
    });

    // Fetch weather for ALL locations from all regions
    const failures: Array<{ mountain: string; error: string }> = [];

    const settled = await Promise.allSettled(
      allMountains.map(async (mountain) => {
        const weather = await getWeather(mountain.lat, mountain.lon);
        const windSpeedNum = parseWindNumber(weather.windSpeed);
        const windGustNum = parseWindNumber(weather.windGust);
        const currentTemp = weather.temperature || 0;
        const windChill = weather.windChill ?? currentTemp; // Use API value, fallback to temp

        // Find min/max temps from next 24 hours of hourly forecast
        const hourlyTemps = weather.hourlyForecast
          ?.slice(0, 24) // Next 24 hours
          .map(h => h.temperature)
          .filter((t): t is number => typeof t === 'number') || [];
        
        const minTemp = hourlyTemps.length > 0 
          ? Math.min(...hourlyTemps, currentTemp) 
          : currentTemp;
        const maxTemp = hourlyTemps.length > 0 
          ? Math.max(...hourlyTemps, currentTemp) 
          : currentTemp;

        return {
          mountain: mountain.name,
          state: mountain.state,
          temperature: currentTemp,
          minTemperature: minTemp,
          maxTemperature: maxTemp,
          windChill: Math.round(windChill),
          windSpeed: windSpeedNum,
          windGust: windGustNum,
          isSnowing: (weather.precipitation || 0) > 50 && currentTemp < 32,
        };
      })
    );

    const results = settled
      .map((r, idx) => {
        if (r.status === 'fulfilled') return r.value;
        const mountain = allMountains[idx];
        failures.push({
          mountain: mountain?.name ?? 'Unknown',
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
        return null;
      })
      .filter(Boolean) as Array<{
      mountain: string;
      state: string;
      temperature: number;
      minTemperature: number;
      maxTemperature: number;
      windChill: number;
      windSpeed: number;
      windGust: number;
      isSnowing: boolean;
    }>;

    if (results.length === 0) {
      console.error('Weather extremes: no results', {
        attempted: allMountains.length,
        failures: failures.slice(0, 3),
      });
      // Return 200 so the client can render an error banner instead of hanging on "loading"
      return NextResponse.json({
        success: false,
        error: 'NWS unavailable (no mountain results)',
        attempted: allMountains.length,
        failed: failures.length,
      });
    }

    // Find extremes
    const highestWind = results.reduce((max, curr) => 
      curr.windGust > max.windGust ? curr : max, results[0]
    );
    
    const highestTemp = results.reduce((max, curr) => 
      curr.maxTemperature > max.maxTemperature ? curr : max, results[0]
    );
    
    const lowestTemp = results.reduce((min, curr) => 
      curr.minTemperature < min.minTemperature ? curr : min, results[0]
    );
    
    const lowestWindChill = results.reduce((min, curr) => 
      curr.windChill < min.windChill ? curr : min, results[0]
    );
    
    const snowingLocations = results.filter(r => r.isSnowing);
    const snowingNames = snowingLocations.map((s) => s.mountain);
    const snowingPreview =
      snowingNames.length <= 3
        ? snowingNames.join(', ')
        : `${snowingNames.slice(0, 3).join(', ')} +${snowingNames.length - 3} more`;

    const stats = [
      {
        label: 'HIGHEST WIND',
        value: `${highestWind.windGust}mph`,
        location: `${highestWind.mountain}, ${highestWind.state}`,
      },
      {
        label: 'HIGHEST TEMP',
        value: `${highestTemp.maxTemperature}°F`,
        location: `${highestTemp.mountain}, ${highestTemp.state}`,
      },
      {
        label: 'LOWEST TEMP',
        value: `${lowestTemp.minTemperature}°F`,
        location: `${lowestTemp.mountain}, ${lowestTemp.state}`,
      },
      {
        label: 'LOWEST WIND CHILL',
        value: `${lowestWindChill.windChill}°F`,
        location: `${lowestWindChill.mountain}, ${lowestWindChill.state}`,
      },
      ...(snowingLocations.length > 0 ? [{
        label: 'SNOWING NOW',
        value: snowingPreview,
        location: snowingLocations[0].state,
      }] : []),
    ];

    const response = NextResponse.json({
      success: true,
      stats,
      attempted: allMountains.length,
      succeeded: results.length,
      failed: failures.length,
    });

    // Cache weather extremes for 5 minutes (weather updates frequently but not instantly)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;
  } catch (error) {
    console.error('Error fetching weather extremes:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch weather data' }, { status: 500 });
  }
}

function parseWindNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
