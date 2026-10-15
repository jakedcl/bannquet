'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { NavButton } from '@/components/ui/NavButton';
import PageWrapper from '@/components/ui/PageWrapper';

export default function Home() {
  return (
    <PageWrapper>
      <section className="relative min-h-[calc(100vh-72px)] text-white flex items-center justify-center overflow-hidden border-b-4 border-brand-green-dark" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' }}>
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
            >
              <div className="w-full flex justify-center -mt-8 sm:-mt-12">
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
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <NavButton href="/mountain-weather">Mountain Weather</NavButton>
              <NavButton href="/map">Map</NavButton>
              <NavButton href="/community">Community</NavButton>
            </motion.div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
