'use client';

import { useEffect, useState } from 'react';
import { markHomeScreenTipSeen } from '@/app/home-screen-tip';

export function HomeScreenTip({ show }: { show: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (!standalone) setOpen(true);
  }, [show]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div role="dialog" aria-labelledby="home-tip-title" className="w-full max-w-md bg-beige retro-box">
        <header className="bg-[#5c3a1e] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#ffd700]">
          Add BANNQUET to your Home Screen
        </header>
        <div className="space-y-4 p-4">
          <ol className="space-y-4">
            <Step n={1} title="Tap the ••• or Share button in Safari" art={<ShareArt />} />
            <Step n={2} title="Tap Add to Home Screen. It may be under View More." art={<MenuArt />} />
            <Step n={3} title="Keep Open as Web App on, then tap Add." art={<ToggleArt />} />
          </ol>
          {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
          <button
            type="button"
            disabled={pending}
            className="retro-button-yellow w-full rounded-none px-4 py-2 text-sm font-bold uppercase disabled:opacity-60"
            onClick={async () => {
              setPending(true);
              setError(null);
              const result = await markHomeScreenTipSeen();
              setPending(false);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
            }}
          >
            {pending ? 'Saving…' : 'Got it'}
          </button>
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
    <svg viewBox="0 0 96 72" className="h-16 w-24 border-2 border-[#3d2412] bg-[#8b5a2b]" aria-hidden="true">
      {children}
    </svg>
  );
}

function ShareArt() {
  return (
    <Frame>
      <rect x="8" y="46" width="80" height="18" fill="#5c3a1e" />
      <circle cx="28" cy="55" r="2" fill="#ffd700" />
      <circle cx="36" cy="55" r="2" fill="#ffd700" />
      <circle cx="44" cy="55" r="2" fill="#ffd700" />
      <path d="M68 60 V50 M68 50 l-4 4 M68 50 l4 4" stroke="#ffd700" strokeWidth="2" fill="none" />
    </Frame>
  );
}

function MenuArt() {
  return (
    <Frame>
      <rect x="14" y="10" width="68" height="52" fill="#e8e6e1" />
      <rect x="20" y="28" width="56" height="14" fill="#ffd700" stroke="#3d2412" />
      <text x="24" y="38" fontSize="7" fontFamily="Helvetica, Arial, sans-serif" fill="#1a3009">+ Home</text>
    </Frame>
  );
}

function ToggleArt() {
  return (
    <Frame>
      <rect x="10" y="16" width="76" height="40" fill="#e8e6e1" />
      <text x="16" y="30" fontSize="6" fontFamily="Helvetica, Arial, sans-serif" fill="#1a3009">Web App</text>
      <rect x="58" y="20" width="22" height="12" rx="6" fill="#5c3a1e" />
      <circle cx="74" cy="26" r="4" fill="#ffd700" />
      <rect x="52" y="40" width="28" height="10" fill="#ffd700" stroke="#3d2412" />
      <text x="57" y="48" fontSize="7" fontFamily="Helvetica, Arial, sans-serif" fill="#1a3009">Add</text>
    </Frame>
  );
}
