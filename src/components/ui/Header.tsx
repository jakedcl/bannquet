'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOutAction } from '@/app/sign-in/actions';
import { useRegion } from '@/contexts/RegionContext';
import { REGION_OPTIONS } from '@/lib/regions';
import WeatherTicker from './WeatherTicker';

export type HeaderAccount = {
  handle: string | null;
  displayName: string | null;
  role: 'member' | 'admin' | 'pending';
  pendingCount?: number;
} | null;

export default function Header({ account = null }: { account?: HeaderAccount }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const mobileMenuOpen = openPath === pathname;
  const [scrolled, setScrolled] = useState(false);

  // Add shadow when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation items
  const navItems = [
    { href: '/mountain-weather', label: 'mountain weather' },
    { href: '/map', label: 'map' },
    { href: '/community', label: 'community' },
  ];

  const isHomepage = pathname === '/';

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed w-full retro-banner text-white h-header z-50 rounded-none ${
        scrolled ? 'shadow-lg' : ''
      } ${isHomepage ? '!pl-0 !pr-0' : ''}`}
    >
      <div className="w-full h-full flex items-center justify-between">
        {!isHomepage && (
          <Link href="/" className="flex items-center z-20 mr-auto">
            <motion.div
              layoutId="header-logo"
              transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.8 }}
            >
              <Image
                src="/logo.png"
                alt="BNQT Logo"
                width={160}
                height={40}
                priority
                className="object-contain w-auto h-auto max-h-[32px] md:max-h-[40px] hover:opacity-90 transition-opacity"
              />
            </motion.div>
          </Link>
        )}
        
        {isHomepage && (
          <div className="flex-1 flex items-center z-20 min-w-0">
            <WeatherTicker />
          </div>
        )}

        {isHomepage && (
          <div className="hidden md:flex items-center gap-2 shrink-0 pr-3">
            <AccountLinks account={account} pathname={pathname} />
          </div>
        )}

        {/* Desktop Navigation - Hide on homepage */}
        {pathname !== '/' && (
          <nav className="hidden md:flex items-center gap-3 lg:gap-4 ml-auto">
            {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-none px-4 py-2 text-sm font-bold tracking-wide uppercase transition-all
                    ${navItemActive(pathname, item.href)
                      ? 'retro-button-yellow' 
                    : 'retro-button-blue text-white'}
                  `}
                >
                  {item.label}
                </Link>
              ))}
            <AccountLinks account={account} pathname={pathname} />
            
            {/* Region selector - only show on weather pages */}
            {(pathname === '/weather' || pathname.startsWith('/weather/')) && (
              <div className="relative flex items-center border-2 border-white/40">
                <RegionSelector alignment="left" size="desktop" embedded />
              </div>
            )}
          </nav>
        )}

        {/* Mobile: Region selector + Menu Button (homepage: header has no horizontal padding, keep tap margin) */}
        <div className={`flex items-center gap-2 md:hidden ml-auto ${isHomepage ? 'pr-3' : ''}`}>
          {/* Region selector - only show on weather pages */}
          {(pathname === '/weather' || pathname.startsWith('/weather/')) && (
            <div className="relative">
              <RegionSelector alignment="right" size="mobile" embedded />
            </div>
          )}
          
          <button 
            onClick={() => setOpenPath(mobileMenuOpen ? null : pathname)}
            className="z-20 p-2"
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
              className="fixed inset-0 z-10 bg-ink/40 md:hidden"
              onClick={() => setOpenPath(null)}
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
              className="fixed top-0 right-0 bottom-0 z-20 flex w-[min(88vw,20rem)] flex-col border-l-[3px] border-ink bg-brand-green-dark p-4 pt-24 shadow-[-4px_0_0_var(--ink)] md:hidden"
            >
              {/* Navigation Items for Mobile */}
              <div className="mb-6">
                <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-white/70">Navigation</p>
                <div className="space-y-3">
                  {navItems.map((item) => {
                    const isActive = navItemActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`w-full ${isActive ? 'retro-button-yellow' : 'retro-button'}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <AccountLinks account={account} pathname={pathname} stacked />
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
} 

function navItemActive(pathname: string, href: string): boolean {
  if (href === '/community') {
    return pathname === '/community'
      || pathname.startsWith('/community/')
      || pathname === '/posts'
      || pathname.startsWith('/posts/')
      || pathname === '/stats'
      || pathname.startsWith('/stats/')
      || pathname === '/trips'
      || pathname.startsWith('/trips/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AccountLinks({
  account,
  pathname,
  stacked = false,
}: {
  account: HeaderAccount;
  pathname: string;
  stacked?: boolean;
}) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonClass = stacked
    ? 'retro-button w-full'
    : 'retro-button-blue';

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenPath(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPath(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!account) {
    return (
      <Link href="/sign-in" className={buttonClass}>
        Log in
      </Link>
    );
  }

  const profileHref = account.handle ? `/user/${account.handle}` : '/settings';
  const name = account.displayName || account.handle || 'you';
  const settingsOn = open || pathname === '/settings' || pathname === '/admin' || pathname === profileHref;
  const itemClass = stacked
    ? 'retro-button w-full'
    : 'retro-button w-full justify-start text-xs';

  return (
    <div ref={menuRef} className={stacked ? 'space-y-2' : 'flex items-center gap-2'}>
      <p className={stacked
        ? 'px-2 text-center text-xs text-white/80'
        : 'max-w-36 truncate text-xs normal-case tracking-normal text-white/80'}>
        Logged in as {name}
      </p>
      <div className={stacked ? 'space-y-2' : 'relative flex items-center gap-2'}>
        <div className={stacked ? '' : 'relative'}>
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpenPath(open ? null : pathname)}
            className={settingsOn
              ? (stacked ? 'retro-button-yellow w-full' : buttonClass.replace('retro-button-blue', 'retro-button-yellow'))
              : buttonClass}
          >
            Settings
          </button>
          {open ? (
            <div
              role="menu"
              aria-label="Settings"
              className={stacked
                ? 'space-y-2'
                : 'absolute right-0 top-full z-30 mt-2 flex min-w-40 flex-col gap-1 retro-pop'}
            >
              <Link role="menuitem" href={profileHref} className={itemClass} onClick={() => setOpenPath(null)}>
                Profile
              </Link>
              <Link role="menuitem" href="/settings" className={itemClass} onClick={() => setOpenPath(null)}>
                Settings
              </Link>
              {account.role === 'admin' ? (
                <Link role="menuitem" href="/admin" className={itemClass} onClick={() => setOpenPath(null)}>
                  Admin
                  {account.pendingCount ? (
                    <span className="ml-2 inline-block min-w-5 bg-brand-green px-1 text-center text-xs font-bold text-white">
                      {account.pendingCount}
                    </span>
                  ) : null}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <form action={signOutAction}>
          <button type="submit" className={buttonClass}>Log out</button>
        </form>
      </div>
    </div>
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
    // Embedded in group: compact for mobile header
    if (size === 'mobile') {
      buttonClasses = 'border-2 border-white/50 px-2.5 py-1.5 text-sm font-bold tracking-wide';
    } else {
      buttonClasses = 'border-2 border-white/50 px-3 py-1.5 text-sm font-bold tracking-wide';
    }
  } else if (size === 'desktop') {
    buttonClasses = 'border-2 border-white/50 px-3 py-1.5 text-sm font-bold tracking-wide';
  } else {
    buttonClasses = `border-2 border-white/50 px-4 py-3 text-base font-bold tracking-wide ${fullWidth ? 'w-full' : ''}`;
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
            className={`absolute ${alignment === 'left' ? 'left-0' : 'right-0'} top-full z-30 mt-2 ${fullWidth ? 'w-full' : 'w-44'} retro-pop`}
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
                  className={`w-full px-3 py-2 text-left text-sm font-bold ${
                    isActive
                      ? 'bg-mustard text-ink'
                      : 'text-ink hover:bg-beige'
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
