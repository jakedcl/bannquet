'use client';

import { MOUNTAINS } from '@/lib/weather';
import WeatherDashboard from '@/components/WeatherDashboard';

export default function WeatherPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        Mountain Weather
      </h1>
      <div className="grid gap-6 md:grid-cols-2">
        {MOUNTAINS.map((mountain) => (
          <WeatherDashboard
            key={mountain.name}
            mountain={mountain}
          />
        ))}
      </div>
    </div>
  );
} 