'use client';

import { motion } from 'framer-motion';
import { MOUNTAINS } from '@/lib/weather';
import WeatherDashboard from '@/components/WeatherDashboard';
import PageWrapper from '@/components/ui/PageWrapper';

export default function MountainWeatherProject() {
  return (
    <PageWrapper className="bg-gray-50">
      <div className="max-w-container mx-auto px-4 py-16">
        {/* Project Header */}
        <div className="max-w-content mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Mountain Weather Platform
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              A real-time weather visualization system for northeastern US mountains,
              providing accurate and up-to-date conditions for hikers and outdoor enthusiasts.
            </p>
          </motion.div>

          {/* Project Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 grid md:grid-cols-2 gap-8"
          >
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Technology Stack</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Next.js 14 with TypeScript</li>
                <li>Weather.gov API Integration</li>
                <li>React Query for Data Fetching</li>
                <li>Tailwind CSS for Styling</li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Key Features</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Real-time Weather Updates</li>
                <li>Custom Weather Dashboard</li>
                <li>Mountain-specific Data</li>
                <li>Responsive Design</li>
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Live Demo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Live Weather Dashboard
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {MOUNTAINS.map((mountain) => (
              <WeatherDashboard
                key={mountain.name}
                mountain={mountain}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
} 