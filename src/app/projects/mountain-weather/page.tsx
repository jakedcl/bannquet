'use client';

import { motion } from 'framer-motion';
import { MOUNTAINS } from '@/lib/weather';
import WeatherDashboard from '@/components/WeatherDashboard';
import PageWrapper from '@/components/ui/PageWrapper';
import Link from 'next/link';

export default function MountainWeatherProject() {
  return (
    <PageWrapper className="bg-gray-50">
      <div className="max-w-container mx-auto px-4 py-12">
        {/* Project Header */}
        <div className="max-w-content mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Mountain Weather
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real-time conditions for northeastern high peaks
            </p>
          </motion.div>
        </div>

        {/* Weather Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {MOUNTAINS.map((mountain) => (
            <WeatherDashboard
              key={mountain.name}
              mountain={mountain}
            />
          ))}
        </motion.div>

        {/* Attribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <div className="bg-white rounded-lg shadow-md p-6 inline-block mx-auto">
            <p className="text-sm text-gray-600 mb-2">
              Weather data provided by the National Weather Service
            </p>
            <Link 
              href="https://www.weather.gov" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-brand-green hover:text-brand-green-light text-sm font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>NOAA / NWS weather.gov</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
} 