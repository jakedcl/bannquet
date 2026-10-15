'use client';

import { NavHistory } from '@/components/ui/NavHistory';
import { AccountProvider, type AccountNav } from '@/contexts/AccountContext';
import { RegionProvider } from '@/contexts/RegionContext';

export default function Providers({
  account,
  children,
}: {
  account: AccountNav;
  children: React.ReactNode;
}) {
  return (
    <AccountProvider account={account}>
      <RegionProvider>
        <NavHistory />
        {children}
      </RegionProvider>
    </AccountProvider>
  );
} 