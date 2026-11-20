'use client';

import { useState, useSyncExternalStore } from 'react';
import { markHomeScreenTipSeen } from '@/app/home-screen-tip';
import { SubmitButton } from '@/components/ui/SubmitButton';

function subscribeClient() {
  return () => {};
}

function serverReady() {
  return false;
}

function tipInBrowser() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return !(window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true);
}

export function HomeScreenTip({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inBrowser = useSyncExternalStore(subscribeClient, tipInBrowser, serverReady);

  if (!show || dismissed || !inBrowser) return null;

  return (
    <div className="motion-sheet fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div role="dialog" aria-labelledby="home-tip-title" className="motion-panel panel w-full max-w-md bg-surface-gray">
        <header className="panel-bar">
          Add BANNQUET to your Home Screen
        </header>
        <div className="space-y-4 p-4">
          <ol className="space-y-4">
            <Step n={1} title="Tap the ••• or Share button in Safari" art={<ShareArt />} />
            <Step n={2} title="Tap Add to Home Screen. It may be under View More." art={<MenuArt />} />
            <Step n={3} title="Keep Open as Web App on, then tap Add." art={<ToggleArt />} />
          </ol>
          {error ? <p className="text-sm font-bold text-danger">{error}</p> : null}
          <form
            action={async () => {
              setError(null);
              const result = await markHomeScreenTipSeen();
              if (result?.error) {
                setError(result.error);
                return;
              }
              setDismissed(true);
            }}
          >
            <SubmitButton tone="yellow" pendingLabel="Saving…" className="w-full">Got it</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, art }: { n: number; title: string; art: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="w-24 shrink-0">{art}</div>
      <p className="text-sm">
        <span className="font-bold">{n}. </span>
        {title}
      </p>
    </li>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-24 rounded-tag border-2 border-brown-dark bg-brown-light" aria-hidden="true">
      {children}
    </svg>
  );
}

function ShareArt() {
  return (
    <Frame>
      <rect x="8" y="46" width="80" height="18" fill="var(--color-brown)" />
      <circle cx="28" cy="55" r="2" fill="var(--color-yellow)" />
      <circle cx="36" cy="55" r="2" fill="var(--color-yellow)" />
      <circle cx="44" cy="55" r="2" fill="var(--color-yellow)" />
      <path d="M68 60 V50 M68 50 l-4 4 M68 50 l4 4" stroke="var(--color-yellow)" strokeWidth="2" fill="none" />
    </Frame>
  );
}

function MenuArt() {
  return (
    <Frame>
      <rect x="14" y="10" width="68" height="52" fill="var(--color-surface-gray)" />
      <rect x="20" y="28" width="56" height="14" fill="var(--color-yellow)" stroke="var(--color-brown-dark)" />
      <text x="24" y="38" fontSize="7" fontFamily="Helvetica, Arial, sans-serif" fill="var(--color-brand-dark)">+ Home</text>
    </Frame>
  );
}

function ToggleArt() {
  return (
    <Frame>
      <rect x="10" y="16" width="76" height="40" fill="var(--color-surface-gray)" />
      <text x="16" y="30" fontSize="6" fontFamily="Helvetica, Arial, sans-serif" fill="var(--color-brand-dark)">Web App</text>
      <rect x="58" y="20" width="22" height="12" rx="6" fill="var(--color-brown)" />
      <circle cx="74" cy="26" r="4" fill="var(--color-yellow)" />
      <rect x="52" y="40" width="28" height="10" fill="var(--color-yellow)" stroke="var(--color-brown-dark)" />
      <text x="57" y="48" fontSize="7" fontFamily="Helvetica, Arial, sans-serif" fill="var(--color-brand-dark)">Add</text>
    </Frame>
  );
}
