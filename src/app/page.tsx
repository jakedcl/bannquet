'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MOTION_TWEEN } from '@/lib/motion';
import Image from 'next/image';
import Link from 'next/link';
import { menuItemClass, NavButton } from '@/components/ui/NavButton';
import { NavMenu } from '@/components/ui/NavMenu';
import PageWrapper from '@/components/ui/PageWrapper';
import { COMMUNITY_LINKS, WEATHER_LINKS } from '@/lib/sections';

export default function Home() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const tween = reduce ? { duration: 0 } : MOTION_TWEEN;

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('home-enter')) return;
    const timer = window.setTimeout(() => root.classList.remove('home-enter'), 520);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove('home-enter');
    };
  }, []);

  return (
    <PageWrapper>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{if(window.__bannquetHomeEnter)return;window.__bannquetHomeEnter=1;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.documentElement.classList.add('home-enter');}catch(e){}})();`,
        }}
      />
      <section className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-visible border-b-4 border-brand-green-dark text-white" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' }}>
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 overflow-hidden"
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
            <div className="home-hero-logo">
              <div className="w-full flex justify-center -mt-8 sm:-mt-12">
                <div className="w-full max-w-[280px] sm:max-w-[350px] md:max-w-[420px] lg:max-w-[500px]">
                  <motion.div
                    layoutId="header-logo"
                    transition={tween}
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
            </div>

            <div className="home-hero-actions relative z-20 mx-auto flex w-full max-w-sm flex-col items-stretch gap-4 overflow-visible sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-6">
              <NavMenu
                layout="responsive"
                size="lg"
                href="/mountain-weather"
                label="Mountain Weather"
                open={openMenu === 'weather'}
                onOpen={() => setOpenMenu('weather')}
              >
                {WEATHER_LINKS.map((item) => (
                  <Link key={item.href} href={item.href} className={menuItemClass(true, 'lg')}>
                    {item.label}
                  </Link>
                ))}
              </NavMenu>
              <NavButton href="/map" size="lg" className="w-full sm:w-auto">Map</NavButton>
              <NavButton href="/fishing" size="lg" className="w-full sm:w-auto">Fishing</NavButton>
              <NavMenu
                layout="responsive"
                size="lg"
                href="/community"
                label="Community"
                open={openMenu === 'community'}
                onOpen={() => setOpenMenu('community')}
              >
                {COMMUNITY_LINKS.map((item) => (
                  <Link key={item.href} href={item.href} className={menuItemClass(true, 'lg')}>
                    {item.label}
                  </Link>
                ))}
              </NavMenu>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
