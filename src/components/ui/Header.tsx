'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOutAction } from '@/app/sign-in/actions';
import { useRegion } from '@/contexts/RegionContext';
import { REGION_OPTIONS } from '@/lib/regions';
import { COMMUNITY_LINKS, UPLOAD_LINKS, WEATHER_LINKS, communitySection, pathOn, settingsHref, settingsLinks, settingsSection, visibleLinks } from '@/lib/sections';
import { menuItemClass, NavButton } from './NavButton';
import { NavMenu } from './NavMenu';
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
  const [menuReady, setMenuReady] = useState(false);
  const isHomepage = pathname === '/';
  const onWeather = pathname === '/weather' || pathname.startsWith('/weather/');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuReady(true);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed z-50 h-header w-full rounded-none text-white retro-banner ${
        scrolled ? 'shadow-lg' : ''
      } ${isHomepage ? '!pl-0 !pr-0' : ''}`}
    >
      <div className="flex h-full w-full items-center justify-between">
        {!isHomepage && (
          <Link href="/" className="header-logo-link z-20">
            <motion.div
              layoutId="header-logo"
              transition={{ type: 'spring', stiffness: 200, damping: 25, duration: 0.8 }}
              className="shrink-0"
            >
              <Image
                src="/logo.png"
                alt="BNQT Logo"
                width={160}
                height={40}
                priority
                className="header-logo hover:opacity-90"
              />
            </motion.div>
          </Link>
        )}

        {isHomepage && (
          <div className="z-20 flex min-w-0 flex-1 items-center">
            <WeatherTicker />
          </div>
        )}

        <nav className={`ml-auto hidden items-center gap-2 md:flex ${isHomepage ? 'pr-3' : ''}`}>
          <SiteNav account={account} pathname={pathname} home={isHomepage} />
          {onWeather ? (
            <div className="relative flex items-center gap-2 rounded-full border border-white/30 bg-brand-green-light/40 px-2 py-1">
              <RegionSelector alignment="left" size="desktop" embedded />
            </div>
          ) : null}
        </nav>

        <div className={`ml-auto flex items-center gap-2 md:hidden ${isHomepage ? 'pr-3' : ''}`}>
          {onWeather ? (
            <div className="relative">
              <RegionSelector alignment="right" size="mobile" embedded />
            </div>
          ) : null}
          <button
            onClick={() => setOpenPath(mobileMenuOpen ? null : pathname)}
            className="relative z-[110] p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <div className="flex w-6 flex-col items-end justify-center gap-1.5">
              <span className={`block h-0.5 bg-white transition-all duration-300 ease-out ${mobileMenuOpen ? 'w-6 -rotate-45 translate-y-2' : 'w-6'}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ease-out ${mobileMenuOpen ? 'w-6 opacity-0' : 'w-5 opacity-100'}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ease-out ${mobileMenuOpen ? 'w-6 rotate-45 -translate-y-2' : 'w-4'}`} />
            </div>
          </button>
        </div>

        {menuReady ? createPortal(
          <AnimatePresence>
            {mobileMenuOpen ? (
              <motion.nav
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                aria-label="Menu"
                className="fixed inset-0 z-[100] flex flex-col gap-4 overflow-y-auto border-l-4 border-brand-green-dark bg-beige p-4 pt-16 text-gray-900 md:hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenPath(null)}
                  className="absolute right-3 top-3 p-2"
                  aria-label="Close menu"
                >
                  <span className="relative block h-4 w-6">
                    <span className="absolute left-0 top-1.5 block h-0.5 w-6 -rotate-45 bg-brand-green-dark" />
                    <span className="absolute left-0 top-1.5 block h-0.5 w-6 rotate-45 bg-brand-green-dark" />
                  </span>
                </button>
                <MobileNav account={account} pathname={pathname} />
              </motion.nav>
            ) : null}
          </AnimatePresence>,
          document.body,
        ) : null}
      </div>
    </motion.header>
  );
}

function SiteNav({ account, pathname, home }: { account: HeaderAccount; pathname: string; home: boolean }) {
  const canUpload = account == null || account.role !== 'pending';
  const settingsOn = settingsSection(pathname, account);

  return (
    <>
      {home ? null : (
        <>
          <NavMenu href="/mountain-weather" label="Mountain weather" active={pathOn(pathname, '/mountain-weather')}>
            {WEATHER_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={menuItemClass(false)}>
                {item.label}
              </Link>
            ))}
          </NavMenu>
          <NavButton href="/map" active={pathOn(pathname, '/map')}>
            Map
          </NavButton>
          <NavMenu href="/community" label="Community" active={communitySection(pathname, account)}>
            {COMMUNITY_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={menuItemClass(false)}>
                {item.label}
              </Link>
            ))}
          </NavMenu>
        </>
      )}
      {canUpload ? (
        <NavMenu href="/upload" label="Upload" active={pathOn(pathname, '/upload')}>
          {UPLOAD_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={menuItemClass(false)}>
              {item.label}
            </Link>
          ))}
        </NavMenu>
      ) : null}
      {account ? (
        <NavMenu href={settingsHref(account)} label="Settings" active={settingsOn} align="right">
          {visibleLinks(settingsLinks(account)).map((item) => (
            <Link key={item.href} href={item.href} className={menuItemClass(false)}>
              {item.label}
              {item.href === '/admin' && account.pendingCount ? (
                <span className="ml-2 inline-block min-w-5 bg-brand-green px-1 text-center text-xs font-bold text-white">
                  {account.pendingCount}
                </span>
              ) : null}
            </Link>
          ))}
          <form action={signOutAction}>
            <button type="submit" className={menuItemClass(false)}>Log out</button>
          </form>
        </NavMenu>
      ) : (
        <NavButton href="/sign-in">Log in</NavButton>
      )}
    </>
  );
}

function MobileNav({ account, pathname }: { account: HeaderAccount; pathname: string }) {
  const canUpload = account == null || account.role !== 'pending';
  const settingsOn = settingsSection(pathname, account);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <>
      <NavMenu
        layout="inline"
        href="/mountain-weather"
        label="Mountain weather"
        active={pathOn(pathname, '/mountain-weather')}
        open={openMenu === 'weather'}
        onOpen={() => setOpenMenu('weather')}
      >
        {WEATHER_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className={menuItemClass(true)}>
            {item.label}
          </Link>
        ))}
      </NavMenu>
      <NavButton href="/map" active={pathOn(pathname, '/map')} className="w-full">
        Map
      </NavButton>
      <NavMenu
        layout="inline"
        href="/community"
        label="Community"
        active={communitySection(pathname, account)}
        open={openMenu === 'community'}
        onOpen={() => setOpenMenu('community')}
      >
        {COMMUNITY_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className={menuItemClass(true)}>
            {item.label}
          </Link>
        ))}
      </NavMenu>
      {canUpload ? (
        <NavMenu
          layout="inline"
          href="/upload"
          label="Upload"
          active={pathOn(pathname, '/upload')}
          open={openMenu === 'upload'}
          onOpen={() => setOpenMenu('upload')}
        >
          {UPLOAD_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={menuItemClass(true)}>
              {item.label}
            </Link>
          ))}
        </NavMenu>
      ) : null}
      {account ? (
        <NavMenu
          layout="inline"
          href={settingsHref(account)}
          label="Settings"
          active={settingsOn}
          open={openMenu === 'settings'}
          onOpen={() => setOpenMenu('settings')}
        >
          {visibleLinks(settingsLinks(account)).map((item) => (
            <Link key={item.href} href={item.href} className={menuItemClass(true)}>
              {item.label}
              {item.href === '/admin' && account.pendingCount ? (
                <span className="ml-2 inline-block min-w-5 bg-brand-green px-1 text-center text-xs font-bold text-white">
                  {account.pendingCount}
                </span>
              ) : null}
            </Link>
          ))}
          <form action={signOutAction}>
            <button type="submit" className={menuItemClass(true)}>Log out</button>
          </form>
        </NavMenu>
      ) : (
        <NavButton href="/sign-in" className="w-full">Log in</NavButton>
      )}
    </>
  );
}

type RegionSelectorProps = {
  className?: string;
  alignment?: 'left' | 'right';
  size?: 'desktop' | 'mobile';
  fullWidth?: boolean;
  embedded?: boolean;
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

  let buttonClasses: string;
  if (embedded) {
    buttonClasses = size === 'mobile'
      ? 'rounded-full px-2.5 py-1.5 text-sm font-bold tracking-wide'
      : 'rounded-full px-3 py-1.5 text-lg font-bold tracking-wide';
  } else if (size === 'desktop') {
    buttonClasses = 'rounded-full border px-4 py-1.5 text-sm font-bold tracking-wide';
  } else {
    buttonClasses = `rounded-xl border px-4 py-3 text-base font-semibold ${fullWidth ? 'w-full' : ''}`;
  }

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`${buttonClasses} flex items-center ${fullWidth ? 'justify-center' : ''} gap-1 transition-colors ${
          embedded
            ? 'text-white hover:bg-white/10'
            : open
              ? 'border-white bg-white text-brand-green'
              : 'border-white/30 text-white hover:border-white hover:bg-white/10'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {region.toUpperCase()}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
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
            className={`absolute ${alignment === 'left' ? 'left-0' : 'right-0'} top-full z-30 mt-2 ${fullWidth ? 'w-full' : 'w-40'} overflow-hidden rounded-2xl border border-white/20 bg-brand-green/95 shadow-2xl backdrop-blur-xl`}
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
                  className={`w-full px-4 py-2 text-left text-sm font-semibold transition-colors ${
                    isActive ? 'bg-white text-brand-green' : 'text-white/80 hover:bg-white/10'
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
