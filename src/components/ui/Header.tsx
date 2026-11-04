'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MOTION_TWEEN } from '@/lib/motion';
import { signOutAction } from '@/app/sign-in/actions';
import { COMMUNITY_LINKS, FISHING_LINKS, UPLOAD_LINKS, WEATHER_LINKS, communitySection, pathOn, settingsHref, settingsLinks, settingsSection, visibleLinks } from '@/lib/sections';
import { menuItemClass, NavButton } from './NavButton';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { NavMenu } from './NavMenu';
import WeatherTicker from './WeatherTicker';

function subscribeClient() {
  return () => {};
}

function clientReady() {
  return true;
}

function serverReady() {
  return false;
}

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
  const menuReady = useSyncExternalStore(subscribeClient, clientReady, serverReady);
  const isHomepage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const reduce = useReducedMotion();
  const tween = reduce ? { duration: 0 } : MOTION_TWEEN;

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={tween}
      className={`site-header fixed z-50 h-header w-full rounded-none text-white retro-banner ${
        scrolled ? 'shadow-lg' : ''
      } ${isHomepage ? '!pl-0 !pr-0' : ''}`}
    >
      <div className="flex h-full w-full items-center justify-between">
        {!isHomepage && (
          <Link href="/" className="header-logo-link z-20">
            <motion.div
              layoutId="header-logo"
              transition={tween}
              className="shrink-0"
            >
              <Image
                src="/logo.png"
                alt="BNQT Logo"
                width={160}
                height={40}
                priority
                unoptimized
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
        </nav>

        <div className={`ml-auto flex items-center gap-2 md:hidden ${isHomepage ? 'pr-3' : ''}`}>
          <button
            onClick={() => setOpenPath(mobileMenuOpen ? null : pathname)}
            className="relative z-[110] p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <div className="flex w-6 flex-col items-end justify-center gap-1.5">
              <span className={`motion-swap block h-0.5 bg-white ${mobileMenuOpen ? 'w-6 -rotate-45 translate-y-2' : 'w-6'}`} />
              <span className={`motion-swap block h-0.5 bg-white ${mobileMenuOpen ? 'w-6 opacity-0' : 'w-5 opacity-100'}`} />
              <span className={`motion-swap block h-0.5 bg-white ${mobileMenuOpen ? 'w-6 rotate-45 -translate-y-2' : 'w-4'}`} />
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
                transition={tween}
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
          <NavMenu href="/fishing" label="Fishing" active={pathOn(pathname, '/fishing')}>
            {FISHING_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={menuItemClass(false)}>
                {item.label}
              </Link>
            ))}
          </NavMenu>
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
            <SubmitButton unstyled pendingLabel="Signing out…" className={menuItemClass(false)}>Log out</SubmitButton>
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
        href="/fishing"
        label="Fishing"
        active={pathOn(pathname, '/fishing')}
        open={openMenu === 'fishing'}
        onOpen={() => setOpenMenu('fishing')}
      >
        {FISHING_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className={menuItemClass(true)}>
            {item.label}
          </Link>
        ))}
      </NavMenu>
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
            <SubmitButton unstyled pendingLabel="Signing out…" className={menuItemClass(true)}>Log out</SubmitButton>
          </form>
        </NavMenu>
      ) : (
        <NavButton href="/sign-in" className="w-full">Log in</NavButton>
      )}
    </>
  );
}
