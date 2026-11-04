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
import { CloseIcon, MoreIcon } from './Icons';
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
    <span className="min-w-5 rounded-full bg-ui-accent px-1.5 text-center text-xs font-semibold text-ui-on-accent">
      {count}
    </span>
  );
}

/** Slim translucent bar. Full links from md up; on a phone the tab bar carries the main sections and More holds the rest. */
export function TopBar({ account }: { account: BarAccount }) {
  const pathname = usePathname();
  const tab = activeTab(pathname, account);
  const canUpload = viewerCanContribute(account);
  const [moreOn, setMoreOn] = useState<string | null>(null);
  const moreOpen = moreOn === pathname;

  return (
    <header className="site-header hub-bar ui-bar ui-hairline-b fixed inset-x-0 top-0 z-50" style={{ height: 'var(--bar-h)' }}>
      <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-3 md:px-5">
        <Link href="/" aria-label="Bannquet home" className="ui-press mr-2 flex shrink-0 items-center">
          <Image src="/logo.png" alt="BANNQUET" width={398} height={114} priority unoptimized className="h-7 w-auto md:h-8" />
        </Link>

        <nav aria-label="Main" className="hidden min-w-0 flex-1 items-center gap-0.5 md:flex">
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

        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          {canUpload ? (
            <Menu label="Upload" active={tab === 'upload'} align="right">
              <MenuLinks links={UPLOAD_LINKS} />
            </Menu>
          ) : null}
          {account ? (
            <Menu
              align="right"
              active={tab === 'profile'}
              label={<span className="flex items-center gap-2">{account.displayName || account.handle || 'Account'}<PendingBadge count={account.pendingCount} /></span>}
            >
              <AccountRows account={account} rowClass={menuRowClass} />
            </Menu>
          ) : (
            <Link href="/sign-in" className="ui-press inline-flex h-9 items-center rounded-full bg-ui-accent px-4 text-[0.9375rem] font-semibold text-ui-on-accent no-underline">
              Log in
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMoreOn(pathname)}
          aria-label="More"
          aria-expanded={moreOpen}
          className="ui-press ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-ui-fill text-ui-label md:hidden"
        >
          <MoreIcon className="h-5 w-5" />
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
        <SubmitButton unstyled pendingLabel="Signing out…" className={`${rowClass} !justify-start text-ui-danger`}>Log out</SubmitButton>
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
    <div className="hub-bar fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="More">
      <button type="button" aria-label="Close" onClick={onClose} className="ui-fade-in absolute inset-0 bg-black/30" />
      <div className="ui-sheet-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[22px] bg-ui-bg px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-2">
        <div className="mx-auto mb-2 h-[5px] w-9 rounded-full bg-ui-fill-2" />
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="t-title2">More</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ui-press flex h-8 w-8 items-center justify-center rounded-full bg-ui-fill text-ui-label-2">
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div onClick={onClose} className="space-y-5">
          <div>
            <p className="t-eyebrow mb-1.5 px-4">Community</p>
            <ListGroup>
              {COMMUNITY_LINKS.filter((item) => item.href !== '/trips').map((item) => (
                <ListRow key={item.href} href={item.href} title={item.label} />
              ))}
            </ListGroup>
          </div>
          <div>
            <p className="t-eyebrow mb-1.5 px-4">Fishing</p>
            <ListGroup>
              {FISHING_LINKS.map((item) => (
                <ListRow key={item.href} href={item.href} title={item.label} />
              ))}
            </ListGroup>
          </div>
          {account ? (
            <div>
              <p className="t-eyebrow mb-1.5 px-4">You</p>
              <ListGroup>
                <ListRow href={profileHref(account)} title="Profile" />
                {account.role === 'admin' ? (
                  <ListRow href="/admin" title="Admin" trailing={<PendingBadge count={account.pendingCount} />} />
                ) : null}
                <li>
                  <form action={signOutAction}>
                    <SubmitButton unstyled pendingLabel="Signing out…" className="ui-row-press min-h-11 w-full !justify-start px-4 py-2.5 text-left text-[1.0625rem] text-ui-danger">
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
