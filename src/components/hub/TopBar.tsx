'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/sign-in/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { MENU_SECTIONS, menuAccountLinks, type NavAccount } from '@/lib/sections';
import { buttonClass } from './Button';
import { ChevronIcon, CloseIcon } from './Icons';

export type BarAccount = (NonNullable<NavAccount> & {
  displayName: string | null;
  pendingCount?: number;
}) | null;

function subscribe() {
  return () => {};
}

function PendingBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger-bright px-1.5 text-tag font-bold text-on-dark">
      {count}
    </span>
  );
}

/** The green banner: logo home, and the menu button at every width. */
export function TopBar({ account }: { account: BarAccount }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <header className="site-header hub-bar fixed inset-x-0 top-0 z-50 border-b-4 border-brand-dark bg-banner text-on-dark shadow-bar" style={{ height: 'var(--bar-h)' }}>
      <div className="flex h-full w-full items-center gap-2 px-3.5 sm:px-6">
        <Link href="/" aria-label="Bannquet home" className="ui-press flex min-h-11 shrink-0 items-center">
          <Image src="/logo.png" alt="BANNQUET" width={398} height={114} priority unoptimized className="header-logo !h-[34px]" />
        </Link>
        <button
          type="button"
          onClick={() => setOpenOn(pathname)}
          aria-label="Menu"
          aria-expanded={open}
          className="ui-press relative ml-auto flex h-11 w-11 items-center justify-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow"
        >
          <span className="flex w-6 flex-col items-end justify-center gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-6 bg-on-dark" />
            <span className="block h-0.5 w-5 bg-on-dark" />
            <span className="block h-0.5 w-4 bg-on-dark" />
          </span>
          {account?.pendingCount ? (
            <span className="absolute -right-0.5 -top-0.5"><PendingBadge count={account.pendingCount} /></span>
          ) : null}
        </button>
      </div>
      {open ? <MenuPanel account={account} pathname={pathname} onClose={() => setOpenOn(null)} /> : null}
    </header>
  );
}

/**
 * The menu: every page is here, either as a main row or as a link under
 * its section. Opens over the page from the right.
 */
function MenuPanel({ account, pathname, onClose }: { account: BarAccount; pathname: string; onClose: () => void }) {
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
  const accountLinks = menuAccountLinks(account);
  return createPortal(
    <div className="hub-bar fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="ui-fade-in absolute inset-0 bg-black/40" />
      <div className="ui-sheet-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-page shadow-bar">
        <div className="page-hero flex items-center gap-3 px-4 py-3.5">
          <h2 className="page-hero-title min-w-0 flex-1">Menu</h2>
          <button type="button" onClick={onClose} aria-label="Close menu" className={buttonClass('gray', 'icon')}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main" onClick={onClose} className="space-y-4 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4">
          <section className="panel">
            <h3 className="panel-bar">Go to</h3>
            <ul className="ui-list">
              {MENU_SECTIONS.map((section) => (
                <li key={section.href}>
                  <MenuRow href={section.href} title={section.label} subtitle={section.note} current={pathname === section.href} />
                  {section.links.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-0.5">
                      {section.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          aria-current={pathname === link.href ? 'page' : undefined}
                          className="chip !min-h-8 !text-tag"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {account ? (
            <section className="panel">
              <h3 className="panel-bar">You</h3>
              <ul className="ui-list">
                {accountLinks.map((link) => (
                  <li key={link.href}>
                    <MenuRow
                      href={link.href}
                      title={link.label}
                      subtitle={link.note}
                      current={pathname === link.href}
                      trailing={link.href === '/admin' ? <PendingBadge count={account.pendingCount} /> : null}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {account ? (
            <form action={signOutAction}>
              <SubmitButton unstyled pendingLabel="Signing out…" className={buttonClass('gray', 'full')}>
                Log out
              </SubmitButton>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/sign-in" className={buttonClass('yellow', 'full')}>Sign in</Link>
              <Link href="/sign-up" className={buttonClass('gray', 'full')}>Make an account</Link>
            </div>
          )}
        </nav>
      </div>
    </div>,
    document.body,
  );
}

function MenuRow({
  href,
  title,
  subtitle,
  current,
  trailing,
}: {
  href: string;
  title: string;
  subtitle?: string;
  current: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={`ui-row-press flex min-h-14 items-center gap-2.5 px-3 py-2 no-underline ${current ? 'bg-yellow-soft' : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className="t-headline block text-ink">{title}</span>
        {subtitle ? <span className="block text-caption text-ink-2">{subtitle}</span> : null}
      </span>
      {trailing}
      <ChevronIcon className="h-3 w-2 shrink-0 text-brown-light" />
    </Link>
  );
}
