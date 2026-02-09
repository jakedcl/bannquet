'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';

export default function Home() {
  return (
    <PageWrapper>
      <section className="relative min-h-[calc(100vh-72px)] bg-brand-green text-white flex items-center justify-center overflow-hidden">
        <div className="max-w-container mx-auto px-4 w-full">
          <div className="space-y-12 text-center">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <br/>Bannquet
              </h1>
              <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto">
                Tools and Info for the Mountains of the United States
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/mountain-weather"
                className="group relative px-8 py-4 bg-white text-brand-green rounded-full font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <span className="relative z-10">Mountain Weather</span>
                <div className="absolute inset-0 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/trip-reports"
                className="group relative px-8 py-4 bg-white/10 text-white border-2 border-white/30 rounded-full font-semibold text-lg transition-all hover:bg-white/20 hover:border-white hover:scale-105"
              >
                Trip Reports
              </Link>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="pt-12 space-y-8"
            >
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <FeatureCard
                  title="Real-time Weather"
                  description="Summit vs. valley conditions for NY, VT, NH, and ME"
                  delay={0.5}
                />
                <FeatureCard
                  title="Trip Reports"
                  description="Share and explore adventures from our crew across the US"
                  delay={0.6}
                />
                <FeatureCard
                  title="Detailed Forecasts"
                  description="Hourly and daily forecasts with wind, precipitation, and alerts"
                  delay={0.7}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}

function FeatureCard({ 
  title, 
  description, 
  delay 
}: { 
  title: string; 
  description: string; 
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur"
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-white/70">{description}</p>
    </motion.div>
  );
}
