'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';

export default function Home() {
  return (
    <PageWrapper>
      {/* Hero Section */}
      <section className="relative h-[calc(100vh-72px)] bg-brand-green text-white flex items-center">
        <div className="max-w-container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              leveling up in the browser
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              
            </p>
            <Link 
              href="/projects"
              className="inline-block bg-white text-brand-green px-8 py-4 rounded-lg 
                font-medium hover:bg-white/90 transition-colors"
            >
              web projects
            </Link>
          </motion.div>
        </div>
      </section>
    </PageWrapper>
  );
}
