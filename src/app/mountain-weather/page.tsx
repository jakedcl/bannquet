'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import PageWrapper from '@/components/ui/PageWrapper';
import { useRegion } from '@/contexts/RegionContext';
import { REGION_OPTIONS } from '@/lib/regions';
import { useRouter } from 'next/navigation';

export default function MountainWeatherPage() {
  const { region, setRegion } = useRegion();
  const router = useRouter();
  
  useEffect(() => {
    if (!region) return;
  }, [region]);

  const handleSelect = (code: (typeof REGION_OPTIONS)[number]['code']) => {
    setRegion(code);
    router.push('/weather');
  };

  return (
    <PageWrapper>
      <section className="relative min-h-[calc(100vh-72px)] bg-brand-green text-white flex items-center justify-center overflow-hidden py-8">
        {/* Background Image - same as homepage */}
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
          <div className="space-y-8 md:space-y-10">
            <AnimatedHero />
            <RegionPicker onSelect={handleSelect} />
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}

function AnimatedHero() {
  const words = ['northeast', 'mountain', 'weather'];
  return (
    <div className="flex flex-col items-center text-center w-full px-2">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
        {words.map((word, idx) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.2, duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-6xl font-bold whitespace-nowrap retro-text-shadow"
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function RegionPicker({ onSelect }: { onSelect: (code: (typeof REGION_OPTIONS)[number]['code']) => void }) {
  // Color mapping for each state button
  const buttonColors: Record<string, string> = {
    ny: 'retro-button-yellow',
    vt: 'retro-button-green',
    nh: 'retro-button-blue',
    me: 'retro-button-purple',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="retro-box bg-white/10 border-2 border-white/30 p-6 sm:p-8 w-full max-w-3xl mx-auto rounded-none"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <h3 className="text-xl sm:text-2xl font-bold text-brand-green mb-6 text-center retro-text-shadow uppercase tracking-wider">
        Choose your state
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {REGION_OPTIONS.map((opt, idx) => (
          <motion.button
            key={opt.code}
            onClick={() => onSelect(opt.code)}
            className={`${buttonColors[opt.code] || 'retro-button'} p-4 sm:p-5 text-center rounded-none font-bold uppercase tracking-wider`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
          >
            <p className="text-xl sm:text-2xl font-bold">{opt.label}</p>
            <p className="text-xs sm:text-sm mt-1 opacity-90">Weather</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
