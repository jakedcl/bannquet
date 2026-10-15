'use client';

import { createContext, useContext } from 'react';

export type AccountNav = {
  handle: string | null;
  displayName: string | null;
  role: 'member' | 'admin' | 'pending';
  pendingCount?: number;
} | null;

const AccountContext = createContext<AccountNav>(null);

export function AccountProvider({
  account,
  children,
}: {
  account: AccountNav;
  children: React.ReactNode;
}) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountNav {
  return useContext(AccountContext);
}
