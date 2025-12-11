'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegion } from '@/contexts/RegionContext';
import { REGION_OPTIONS } from '@/lib/regions';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Add shadow when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Region-dependent nav items (grouped together)
  const regionNavItems = [
    { href: '/weather', label: 'weather dashboard' },
    { href: '/map', label: 'map + pins' },
  ];

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed w-full bg-brand-green text-white h-header z-50 transition-shadow duration-300 ${
        scrolled ? 'shadow-lg' : ''
      }`}
    >
      <div className="w-full px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center z-20 mr-auto">
          <Image
            src="/logo.png"
            alt="BNQT Logo"
            width={160}
            height={40}
            priority
            className="object-contain w-auto h-auto max-h-[32px] md:max-h-[40px] hover:opacity-90 transition-opacity"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-4 ml-auto">
          {/* Region Group: State selector + Weather + Map */}
          <div className="relative flex items-center gap-2 bg-brand-green-light/40 rounded-full px-2 py-1 border border-white/30 hover:border-white transition-all group">
            <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-all pointer-events-none"></div>
            <div className="relative flex items-center gap-2 z-10">
            <RegionSelector alignment="left" size="desktop" embedded />
            
            {regionNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-1.5 text-sm font-semibold tracking-wide transition-colors rounded-full border isolate
                  ${pathname === item.href 
                    ? 'bg-white text-brand-green border-white' 
                    : 'bg-brand-green text-white border-white/30 hover:border-white hover:bg-white/10'}
                `}
              >
                {item.label}
              </Link>
            ))}
            </div>
          </div>

          {/* Community Map - Independent */}
          <Link
            href="/usermap"
            className={`relative px-4 py-2 text-sm font-semibold tracking-wide transition-colors rounded-full border
              ${pathname === '/usermap' 
                ? 'bg-white text-brand-green border-white' 
                : 'text-white border-white/30 hover:border-white hover:bg-white/10'}
            `}
          >
            live visitors
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden ml-auto">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="z-20 p-2 focus:outline-none"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <div className="w-6 flex flex-col items-end justify-center gap-1.5">
              <span 
                className={`block h-0.5 bg-white transition-all duration-300 ease-out ${
                  mobileMenuOpen ? 'w-6 -rotate-45 translate-y-2' : 'w-6'
                }`}
              />
              <span 
                className={`block h-0.5 bg-white transition-all duration-300 ease-out ${
                  mobileMenuOpen ? 'opacity-0 w-6' : 'w-5 opacity-100'
                }`}
              />
              <span 
                className={`block h-0.5 bg-white transition-all duration-300 ease-out ${
                  mobileMenuOpen ? 'w-6 rotate-45 -translate-y-2' : 'w-4'
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-brand-green z-10 md:hidden flex flex-col p-6 pt-24"
            >
              {/* Region Group for Mobile */}
              <div className="mb-6">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-3 px-2">Mountain Region</p>
                <div className="bg-brand-green-light/40 rounded-2xl p-3 border border-white/10 space-y-2">
                  <RegionSelector alignment="left" size="mobile" fullWidth />
                  
                  {regionNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-3 text-base font-semibold rounded-xl border text-center transition-colors ${
                          isActive
                            ? 'bg-white text-brand-green border-white'
                            : 'text-white border-white/30 hover:border-white hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Independent Items */}
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider mb-3 px-2">Community</p>
                <Link
                  href="/usermap"
                  className={`block px-4 py-3 text-base font-semibold rounded-xl border text-center transition-colors ${
                    pathname === '/usermap'
                      ? 'bg-white text-brand-green border-white'
                      : 'text-white border-white/30 hover:border-white hover:bg-white/10'
                  }`}
                >
                  live visitors
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
} 

type RegionSelectorProps = {
  className?: string;
  alignment?: 'left' | 'right';
  size?: 'desktop' | 'mobile';
  fullWidth?: boolean;
  embedded?: boolean; // When inside a group, no border needed
};

function RegionSelector({ className = '', alignment = 'right', size = 'desktop', fullWidth = false, embedded = false }: RegionSelectorProps) {
  const { region, setRegion } = useRegion();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Different styles based on context
  let buttonClasses: string;
  if (embedded) {
    // Embedded in group: no border, larger text
    buttonClasses = 'px-3 py-1.5 text-lg font-bold tracking-wide rounded-full';
  } else if (size === 'desktop') {
    buttonClasses = 'px-4 py-1.5 text-sm font-bold tracking-wide rounded-full border';
  } else {
    buttonClasses = `px-4 py-3 text-base font-semibold rounded-xl border ${fullWidth ? 'w-full' : ''}`;
  }

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`${buttonClasses} flex items-center ${fullWidth ? 'justify-center' : ''} gap-1 transition-colors ${
          embedded
            ? 'text-white hover:bg-white/10'
            : open
              ? 'bg-white text-brand-green border-white'
              : 'text-white border-white/30 hover:border-white hover:bg-white/10'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {region.toUpperCase()}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${alignment === 'left' ? 'left-0' : 'right-0'} top-full mt-2 ${fullWidth ? 'w-full' : 'w-40'} rounded-2xl border border-white/20 bg-brand-green/95 backdrop-blur-xl shadow-2xl overflow-hidden z-30`}
            role="listbox"
          >
            {REGION_OPTIONS.map((option) => {
              const isActive = option.code === region;
              return (
                <button
                  key={option.code}
                  onClick={() => {
                    setRegion(option.code);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white text-brand-green'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
