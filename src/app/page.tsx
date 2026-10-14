'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';

export default function Home() {
  return (
    <PageWrapper>
      <section className="relative flex min-h-[calc(100vh-var(--header-offset))] items-center justify-center overflow-hidden border-b-[3px] border-ink text-white">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/background.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-brand-green/85 via-brand-green-dark/90 to-brand-green-dark/95" />
        
        <div className="relative z-10 max-w-container mx-auto px-4 w-full">
          <div className="space-y-12 text-center">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="mb-4 w-full flex justify-center -mt-8 sm:-mt-12">
                <div className="w-full max-w-[280px] sm:max-w-[350px] md:max-w-[420px] lg:max-w-[500px]">
                  <motion.div
                    layoutId="header-logo"
                    transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.8 }}
                  >
                    <Image
                      src="/logo.png"
                      alt="BANNQUET Logo"
                      width={500}
                      height={150}
                      priority
                      className="object-contain w-full h-auto retro-text-shadow"
                      style={{ 
                        filter: 'drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.5))',
                      }}
                    />
                  </motion.div>
                </div>
              </div>
              <p className="mx-auto max-w-2xl font-heading text-2xl text-white retro-text-shadow md:text-3xl">
                Northeast Mountain Resource
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="home-actions flex flex-col items-center justify-center gap-5 sm:flex-row"
            >
              <Link
                href="/mountain-weather"
                className="retro-button-yellow px-10 py-4 font-bold text-lg uppercase tracking-wider rounded-none"
              >
                Mountain Weather
              </Link>
              <Link
                href="/map"
                className="retro-button-orange px-10 py-4 font-bold text-lg uppercase tracking-wider rounded-none"
              >
                Map
              </Link>
              <Link
                href="/community"
                className="retro-button-orange px-10 py-4 font-bold text-lg uppercase tracking-wider rounded-none"
              >
                Community
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
