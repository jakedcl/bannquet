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
              We craft digital experiences that matter
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              A creative web development agency blending computer science expertise 
              with innovative design to create memorable digital solutions.
            </p>
            <Link 
              href="/projects"
              className="inline-block bg-white text-brand-green px-8 py-4 rounded-lg 
                font-medium hover:bg-white/90 transition-colors"
            >
              View Our Projects
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Project Preview */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-12">Featured Project</h2>
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Mountain Weather Platform
              </h3>
              <p className="text-gray-600 mb-6">
                Real-time weather visualization system for northeastern US mountains,
                featuring dynamic dashboards and custom API integration.
              </p>
              <Link 
                href="/projects/mountain-weather"
                className="text-brand-green hover:text-brand-green-light font-medium 
                  inline-flex items-center gap-2 transition-colors"
              >
                View Project
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PageWrapper>
  );
}
