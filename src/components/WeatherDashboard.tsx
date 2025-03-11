'use client';

import { useEffect, useState } from 'react';
import { WeatherData } from '@/types/weather';
import { getWeather } from '@/lib/weather';

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

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <h2 className="font-medium">{mountain.name}</h2>
        <p className="text-sm text-gray-500">Elevation: {mountain.elevation}ft</p>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div>
            <p className="text-sm text-gray-500">Temperature</p>
            <p className="text-2xl font-semibold">{Math.round(weather.temperature)}°F</p>
          </div>
          
          {/* Conditions */}
          <div>
            <p className="text-sm text-gray-500">Conditions</p>
            <p className="text-lg">{weather.conditions[0]}</p>
          </div>
          
          {/* Wind */}
          <div>
            <p className="text-sm text-gray-500">Wind</p>
            <p className="text-lg">{weather.windSpeed} {weather.windDirection}</p>
          </div>
          
          {/* Precipitation */}
          <div>
            <p className="text-sm text-gray-500">Chance of Precipitation</p>
            <p className="text-lg">{weather.precipitation}%</p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400 mt-4">
          Last updated: {new Date(weather.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
} 