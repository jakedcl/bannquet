'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/sign-in/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { viewerCanContribute } from '@/lib/membership';
import {
  COMMUNITY_LINKS,
  FISHING_LINKS,
  UPLOAD_LINKS,
  communitySection,
  pathOn,
  settingsLinks,
  visibleLinks,
  type NavAccount,
  type NavLink,
} from '@/lib/sections';
import { CloseIcon } from './Icons';
import { ListGroup, ListRow } from './ListRow';
import { Menu, barLinkClass, menuRowClass } from './Menu';
import { activeTab, profileHref } from './nav';

export type BarAccount = (NonNullable<NavAccount> & { displayName: string | null; pendingCount?: number }) | null;

function subscribe() {
  return () => {};
}

function PendingBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="inline-block min-w-5 bg-brand-green px-1 text-center text-xs font-bold text-white">
      {count}
    </span>
  );
}

/** The green banner header. Full links from md up; on a phone the tab bar carries the main sections and More holds the rest. */
export function TopBar({ account }: { account: BarAccount }) {
  const pathname = usePathname();
  const tab = activeTab(pathname, account);
  const canUpload = viewerCanContribute(account);
  const [moreOn, setMoreOn] = useState<string | null>(null);
  const moreOpen = moreOn === pathname;

  return (
    <header className="site-header hub-bar retro-banner fixed inset-x-0 top-0 z-50 !px-0 !py-0 text-white" style={{ height: 'var(--bar-h)' }}>
      <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-3">
        <Link href="/" aria-label="Bannquet home" className="ui-press mr-3 flex shrink-0 items-center">
          <Image src="/logo.png" alt="BANNQUET" width={398} height={114} priority unoptimized className="header-logo !h-9 md:!h-10" />
        </Link>

        <nav aria-label="Main" className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          <Link href="/" className={barLinkClass(tab === 'map')}>Map</Link>
          <Link href="/trips" className={barLinkClass(tab === 'trips')}>Trips</Link>
          <Link href="/mountain-weather" className={barLinkClass(tab === 'weather')}>Weather</Link>
          <Menu label="Fishing" active={pathOn(pathname, '/fishing')}>
            <MenuLinks links={[{ href: '/fishing', label: 'All fishing' }, ...FISHING_LINKS]} />
          </Menu>
          <Menu label="Community" active={tab === null && communitySection(pathname, account)}>
            <MenuLinks links={COMMUNITY_LINKS} />
          </Menu>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {canUpload ? (
            <Menu label="Upload" active={tab === 'upload'} align="right">
              <MenuLinks links={UPLOAD_LINKS} />
            </Menu>
          ) : null}
          {account ? (
            <Menu
              align="right"
              active={tab === 'profile'}
              label={<span className="flex items-center gap-2">Settings<PendingBadge count={account.pendingCount} /></span>}
            >
              <AccountRows account={account} rowClass={menuRowClass} />
            </Menu>
          ) : (
            <Link href="/sign-in" className={barLinkClass(tab === 'profile')}>Log in</Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMoreOn(pathname)}
          aria-label="Menu"
          aria-expanded={moreOpen}
          className="ui-press relative ml-auto flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
        >
          <span className="flex w-6 flex-col items-end justify-center gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-5 bg-white" />
            <span className="block h-0.5 w-4 bg-white" />
          </span>
        </button>
      </div>
      {moreOpen ? <MoreSheet account={account} onClose={() => setMoreOn(null)} /> : null}
    </header>
  );
}

function MenuLinks({ links }: { links: readonly NavLink[] }) {
  return visibleLinks(links).map((item) => (
    <Link key={item.href} href={item.href} role="menuitem" className={menuRowClass}>
      {item.label}
    </Link>
  ));
}

function AccountRows({ account, rowClass }: { account: NonNullable<BarAccount>; rowClass: string }) {
  return (
    <>
      {visibleLinks(settingsLinks(account)).map((item) => (
        <Link key={item.href} href={item.href} role="menuitem" className={rowClass}>
          {item.label}
          {item.href === '/admin' ? <PendingBadge count={account.pendingCount} /> : null}
        </Link>
      ))}
      <form action={signOutAction}>
        <SubmitButton unstyled pendingLabel="Signing out…" className={`${rowClass} !justify-start`}>Log out</SubmitButton>
      </form>
    </>
  );
}

/** Phone-only sheet for the sections that are not tabs. */
function MoreSheet({ account, onClose }: { account: BarAccount; onClose: () => void }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  if (!ready) return null;
  return createPortal(
    <div className="hub-bar fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close" onClick={onClose} className="ui-fade-in absolute inset-0 bg-black/40" />
      <div className="ui-panel ui-sheet-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="ui-card-bar sticky top-0 z-10 !py-2">
          <h2 className="min-w-0 flex-1">More</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="retro-button ui-press flex h-8 w-8 items-center justify-center !p-0 text-gray-800">
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div onClick={onClose} className="space-y-4 px-3 pt-3">
          <div>
            <p className="t-eyebrow mb-1">Community</p>
            <ListGroup>
              {COMMUNITY_LINKS.filter((item) => item.href !== '/trips').map((item) => (
                <ListRow key={item.href} href={item.href} title={item.label} />
              ))}
            </ListGroup>
          </div>
          <div>
            <p className="t-eyebrow mb-1">Fishing</p>
            <ListGroup>
              {FISHING_LINKS.map((item) => (
                <ListRow key={item.href} href={item.href} title={item.label} />
              ))}
            </ListGroup>
          </div>
          {account ? (
            <div>
              <p className="t-eyebrow mb-1">You</p>
              <ListGroup>
                <ListRow href={profileHref(account)} title="Profile" />
                {account.role === 'admin' ? (
                  <ListRow href="/admin" title="Admin" trailing={<PendingBadge count={account.pendingCount} />} />
                ) : null}
                <li>
                  <form action={signOutAction}>
                    <SubmitButton unstyled pendingLabel="Signing out…" className="ui-row-press t-headline min-h-11 w-full !justify-start px-3 py-2 text-left text-red-700">
                      Log out
                    </SubmitButton>
                  </form>
                </li>
              </ListGroup>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
