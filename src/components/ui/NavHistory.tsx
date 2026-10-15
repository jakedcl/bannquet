'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordNav } from '@/lib/nav-history';

export function NavHistory() {
  const pathname = usePathname();
  useEffect(() => {
    recordNav(pathname);
  }, [pathname]);
  return null;
}
