'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import PageWrapper from '@/components/ui/PageWrapper';
import { useRegion } from '@/contexts/RegionContext';
import { REGION_OPTIONS } from '@/lib/regions';
import { useRouter } from 'next/navigation';

export default function Home() {
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
      <section className="relative min-h-[calc(100vh-72px)] bg-brand-green text-white flex items-center justify-center overflow-hidden">
        <div className="max-w-container mx-auto px-4 w-full">
          <div className="space-y-10">
            <AnimatedHero />
            <RegionPicker onSelect={handleSelect} />
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}

function AnimatedHero() {
  const words = ['northeast', 'mountain', 'GIS'];
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-3 mb-6">
        {words.map((word, idx) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.2, duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold"
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function RegionPicker({ onSelect }: { onSelect: (code: (typeof REGION_OPTIONS)[number]['code']) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="bg-white/5 border border-white/10 rounded-3xl p-6"
    >
      <h3 className="text-2xl font-semibold text-white mb-4 text-center">
        Choose your state
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {REGION_OPTIONS.map((opt, idx) => (
          <motion.button
            key={opt.code}
            onClick={() => onSelect(opt.code)}
            className="relative overflow-hidden rounded-2xl bg-white/10 border border-white/20 p-4 text-left backdrop-blur hover:bg-white/20 transition shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/0 pointer-events-none" />
            <p className="text-xl font-bold text-white">{opt.label}</p>
            <p className="text-xs text-white/70 mt-1">Pins + Weather</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

