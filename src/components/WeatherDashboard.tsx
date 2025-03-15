'use client';

import { useEffect, useState } from 'react';
import { WeatherData } from '@/types/weather';
import { getWeather } from '@/lib/weather';
import Image from 'next/image';

type Mountain = {
  name: string;
  region: string;
  lat: number;
  lon: number;
  elevation: number;
};

type WeatherDashboardProps = {
  mountain: Mountain;
};

export default function WeatherDashboard({ mountain }: WeatherDashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchWeather() {
      try {
        const data = await getWeather(mountain.lat, mountain.lon);
        if (mounted) {
          setWeather(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load weather data');
          console.error(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchWeather();
    return () => { mounted = false; };
  }, [mountain.lat, mountain.lon]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="font-medium text-red-600">{mountain.name}</h2>
        <p className="text-sm text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  if (!weather) return null;

  // Calculate wind chill if wind speed is available
  // Using the simplified formula: 35.74 + 0.6215T - 35.75(V^0.16) + 0.4275T(V^0.16)
  // where T is temperature in F and V is wind speed in mph
  const windSpeedNum = parseInt(weather.windSpeed.replace(/[^0-9]/g, '')) || 0;
  let windChill = null;
  if (windSpeedNum > 3 && weather.temperature <= 50) {
    windChill = Math.round(
      35.74 + 
      (0.6215 * weather.temperature) - 
      (35.75 * Math.pow(windSpeedNum, 0.16)) + 
      (0.4275 * weather.temperature * Math.pow(windSpeedNum, 0.16))
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="border-b border-gray-100 bg-brand-green/5 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">{mountain.name}</h2>
          <p className="text-sm text-gray-600">Elevation: {mountain.elevation}ft</p>
        </div>
        {weather.icon && (
          <div className="flex-shrink-0">
            <Image 
              src={weather.icon} 
              alt={weather.conditions[0]} 
              width={48} 
              height={48} 
              className="w-12 h-12 object-contain"
            />
          </div>
        )}
      </div>
      
      <div className="p-5">
        <div className="grid grid-cols-2 gap-5">
          {/* Temperature Section */}
          <div className="col-span-2 mb-2 border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Temperature</p>
                <p className="text-3xl font-bold text-brand-green">{Math.round(weather.temperature)}°F</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Feels Like</p>
                <p className="text-xl font-medium">
                  {windChill !== null ? `${windChill}°F` : `${Math.round(weather.temperature)}°F`}
                </p>
              </div>
            </div>
          </div>
          
          {/* Conditions */}
          <div>
            <p className="text-sm text-gray-500">Conditions</p>
            <p className="text-base font-medium">{weather.conditions[0]}</p>
          </div>
          
          {/* Wind */}
          <div>
            <p className="text-sm text-gray-500">Wind</p>
            <p className="text-base font-medium">{weather.windSpeed} {weather.windDirection}</p>
          </div>
          
          {/* Precipitation */}
          <div>
            <p className="text-sm text-gray-500">Precipitation</p>
            <p className="text-base font-medium">{weather.precipitation}%</p>
          </div>
          
          {/* Region */}
          <div>
            <p className="text-sm text-gray-500">Region</p>
            <p className="text-base font-medium">{mountain.region}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <p>
            Last updated: {new Date(weather.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
          <p>Data: <span className="text-brand-green">weather.gov</span></p>
        </div>
      </div>
    </div>
  );
} 