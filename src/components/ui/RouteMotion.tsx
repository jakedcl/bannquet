'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Job = { target: string | null; finish: () => void };

function here() {
  return window.location.pathname + window.location.search;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function viewTransitionsEnabled() {
  if (typeof document.startViewTransition !== 'function') return false;
  if (prefersReducedMotion()) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  return true;
}

export function RouteMotion() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const job = useRef<Job | null>(null);
  const seen = useRef<string | null>(null);

  useLayoutEffect(() => {
    const url = here();
    const changed = seen.current !== null && seen.current !== url;
    seen.current = url;
    const pending = job.current;
    if (pending && (pending.target === null || pending.target === url)) {
      pending.finish();
      return;
    }
    if (!changed || prefersReducedMotion()) return;
    const main = document.querySelector('main.route-stage');
    const frame = main?.querySelector(':scope > .page-frame');
    const map = main?.querySelector(':scope > .map-bleed');
    const el = frame instanceof HTMLElement ? frame : map instanceof HTMLElement ? map : null;
    if (!el) return;
    const klass = frame instanceof HTMLElement ? 'route-rise' : 'route-fade';
    el.classList.remove('route-rise', 'route-fade');
    void el.offsetWidth;
    el.classList.add(klass);
  }, [pathname, search]);

  useLayoutEffect(() => {
    const arm = (target: string | null, go: () => void) => {
      job.current?.finish();
      if (!viewTransitionsEnabled()) {
        go();
        return;
      }
      let started = false;
      try {
        const transition = document.startViewTransition(() => {
          started = true;
          return new Promise<void>((resolve) => {
            let settled = false;
            const finish = () => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timer);
              if (job.current?.finish === finish) job.current = null;
              resolve();
            };
            job.current = { target, finish };
            const timer = window.setTimeout(finish, 1200);
            go();
          });
        });
        transition.ready.catch(() => {});
        transition.finished.catch(() => {});
      } catch {
        if (!started) go();
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const target = url.pathname + url.search;
      if (target === here()) return;
      event.preventDefault();
      event.stopPropagation();
      arm(target, () => router.push(target + url.hash));
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  return null;
}
