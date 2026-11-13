'use client';

import { useEffect } from 'react';

/** Scrolls to a section hash on the legacy state hub. */
export function HashScroll() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);
  return null;
}
