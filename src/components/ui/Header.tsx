'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOutAction } from '@/app/sign-in/actions';
import { useRegion } from '@/contexts/RegionContext';
import { REGION_OPTIONS } from '@/lib/regions';
import { menuItemClass, NavButton } from './NavButton';
import WeatherTicker from './WeatherTicker';

export type HeaderAccount = {
  handle: string | null;
  displayName: string | null;
  role: 'member' | 'admin' | 'pending';
  pendingCount?: number;
} | null;

const COMMUNITY_LINKS = [
  { href: '/chat', label: 'Chat' },
  { href: '/peaks', label: 'Peaks' },
  { href: '/trips', label: 'Trips' },
] as const;

const UPLOAD_LINKS = [
  { href: '/upload?kind=post', label: 'Trip report' },
  { href: '/upload?kind=route', label: 'Route' },
  { href: '/upload?kind=pin', label: 'Pin' },
  { href: '/upload?kind=photo', label: 'Photo' },
] as const;

function pathOn(pathname: string, href: string): boolean {
  const path = href.split('?')[0];
  if (href.includes('?')) return false;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function communitySection(pathname: string): boolean {
  return ['/community', '/chat', '/peaks', '/trips', '/gear'].some((href) => pathOn(pathname, href));
}

export default function Header({ account = null }: { account?: HeaderAccount }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const mobileMenuOpen = openPath === pathname;
  const [scrolled, setScrolled] = useState(false);
  const isHomepage = pathname === '/';
  const onWeather = pathname === '/weather' || pathname.startsWith('/weather/');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
          <Link href="/" className="z-20 mr-auto flex items-center">
            <motion.div
              layoutId="header-logo"
              transition={{ type: 'spring', stiffness: 200, damping: 25, duration: 0.8 }}
            >
              <Image
                src="/logo.png"
                alt="BNQT Logo"
                width={160}
                height={40}
                priority
                className="h-auto max-h-[32px] w-auto object-contain hover:opacity-90 md:max-h-[40px]"
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
            className="z-20 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <div className="flex w-6 flex-col items-end justify-center gap-1.5">
              <span className={`block h-0.5 bg-white transition-all duration-300 ease-out ${mobileMenuOpen ? 'w-6 -rotate-45 translate-y-2' : 'w-6'}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ease-out ${mobileMenuOpen ? 'w-6 opacity-0' : 'w-5 opacity-100'}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ease-out ${mobileMenuOpen ? 'w-6 rotate-45 -translate-y-2' : 'w-4'}`} />
            </div>
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-10 bg-black/20 md:hidden"
              onClick={() => setOpenPath(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              aria-label="Menu"
              className="fixed bottom-0 right-0 top-0 z-10 flex w-4/5 max-w-xs flex-col gap-4 overflow-y-auto border-l-4 border-brand-green-dark bg-beige p-4 pt-24 text-gray-900 md:hidden"
            >
              <MobileNav account={account} pathname={pathname} home={isHomepage} />
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

function SiteNav({ account, pathname, home }: { account: HeaderAccount; pathname: string; home: boolean }) {
  const canUpload = account != null && account.role !== 'pending';
  const profileHref = account?.handle ? `/user/${account.handle}` : '/settings';
  const settingsOn = Boolean(account) && (
    pathOn(pathname, '/settings') || pathOn(pathname, '/admin') || pathname === profileHref
  );

  return (
    <>
      {home ? null : (
        <>
          <NavButton href="/mountain-weather" active={pathOn(pathname, '/mountain-weather')}>
            Mountain weather
          </NavButton>
          <NavButton href="/map" active={pathOn(pathname, '/map')}>
            Map
          </NavButton>
          <DesktopMenu href="/community" label="Community" active={communitySection(pathname)}>
            {COMMUNITY_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={menuItemClass(false)}>
                {item.label}
              </Link>
            ))}
          </DesktopMenu>
        </>
      )}
      {canUpload ? (
        <DesktopMenu href="/upload" label="Upload" active={pathOn(pathname, '/upload')}>
          {UPLOAD_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={menuItemClass(false)}>
              {item.label}
            </Link>
          ))}
        </DesktopMenu>
      ) : null}
      {account ? (
        <DesktopMenu href="/settings" label="Settings" active={settingsOn} align="right">
          <Link href={profileHref} className={menuItemClass(false)}>Profile</Link>
          <Link href="/settings" className={menuItemClass(false)}>Settings</Link>
          {account.role === 'admin' ? (
            <Link href="/admin" className={menuItemClass(false)}>
              Admin
              {account.pendingCount ? (
                <span className="ml-2 inline-block min-w-5 bg-brand-green px-1 text-center text-xs font-bold text-white">
                  {account.pendingCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button type="submit" className={menuItemClass(false)}>Log out</button>
          </form>
        </DesktopMenu>
      ) : (
        <NavButton href="/sign-in">Log in</NavButton>
      )}
    </>
  );
}

function DesktopMenu({
  href,
  label,
  active,
  align = 'left',
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <div className="group relative inline-flex">
      <NavButton href={href} active={active}>{label}</NavButton>
      <div className={`absolute top-full z-30 hidden min-w-40 flex-col gap-1 bg-[#5c3a1e] p-1 group-hover:flex group-focus-within:flex ${align === 'right' ? 'right-0' : 'left-0'}`}>
        {children}
      </div>
    </div>
  );
}

function MobileFold({
  label,
  href,
  active,
  children,
}: {
  label: string;
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex">
        <NavButton href={href} active={active} className="min-w-0 flex-1">{label}</NavButton>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `Hide ${label}` : `Show ${label}`}
          onClick={() => setOpen((value) => !value)}
          className="nav-button retro-button-blue w-10 rounded-none px-0 text-lg font-bold"
        >
          {open ? '−' : '+'}
        </button>
      </div>
      {open ? <div className="flex flex-col gap-1 bg-[#5c3a1e] p-1">{children}</div> : null}
    </div>
  );
}

function MobileNav({ account, pathname, home }: { account: HeaderAccount; pathname: string; home: boolean }) {
  const canUpload = account != null && account.role !== 'pending';
  const profileHref = account?.handle ? `/user/${account.handle}` : '/settings';
  const settingsOn = Boolean(account) && (
    pathOn(pathname, '/settings') || pathOn(pathname, '/admin') || pathname === profileHref
  );

  return (
    <>
      {home ? null : (
        <>
          <NavButton href="/mountain-weather" active={pathOn(pathname, '/mountain-weather')} className="w-full">
            Mountain weather
          </NavButton>
          <NavButton href="/map" active={pathOn(pathname, '/map')} className="w-full">
            Map
          </NavButton>
          <MobileFold href="/community" label="Community" active={communitySection(pathname)}>
            {COMMUNITY_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={menuItemClass(true)}>
                {item.label}
              </Link>
            ))}
          </MobileFold>
        </>
      )}
      {canUpload ? (
        <MobileFold href="/upload" label="Upload" active={pathOn(pathname, '/upload')}>
          {UPLOAD_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={menuItemClass(true)}>
              {item.label}
            </Link>
          ))}
        </MobileFold>
      ) : null}
      {account ? (
        <MobileFold href="/settings" label="Settings" active={settingsOn}>
          <Link href={profileHref} className={menuItemClass(true)}>Profile</Link>
          <Link href="/settings" className={menuItemClass(true)}>Settings</Link>
          {account.role === 'admin' ? (
            <Link href="/admin" className={menuItemClass(true)}>
              Admin
              {account.pendingCount ? (
                <span className="ml-2 inline-block min-w-5 bg-brand-green px-1 text-center text-xs font-bold text-white">
                  {account.pendingCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button type="submit" className={menuItemClass(true)}>Log out</button>
          </form>
        </MobileFold>
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
