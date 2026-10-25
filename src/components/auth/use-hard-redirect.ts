'use client';

import { useEffect } from 'react';

/** Full page load to a path the server action handed back. */
export function useHardRedirect(path: string | undefined): void {
  useEffect(() => {
    if (path) window.location.assign(path);
  }, [path]);
}
