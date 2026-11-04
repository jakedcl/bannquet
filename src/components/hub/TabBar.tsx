'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { viewerCanContribute } from '@/lib/membership';
import type { NavAccount } from '@/lib/sections';
import { MapIcon, ProfileIcon, TripsIcon, UploadIcon, WeatherIcon } from './Icons';
import { activeTab, profileHref, type TabId } from './nav';

type Tab = { id: TabId; href: string; label: string; icon: (props: { className?: string }) => React.ReactNode };

/** Phone-only bottom tab bar in the green banner. Upload only shows for members who can post. */
export function TabBar({ account }: { account: NavAccount }) {
  const pathname = usePathname();
  const current = activeTab(pathname, account);
  const tabs: Tab[] = [
    { id: 'map', href: '/', label: 'Map', icon: MapIcon },
    { id: 'trips', href: '/trips', label: 'Trips', icon: TripsIcon },
  ];
  if (viewerCanContribute(account)) tabs.push({ id: 'upload', href: '/upload', label: 'Upload', icon: UploadIcon });
  tabs.push(
    { id: 'weather', href: '/mountain-weather', label: 'Weather', icon: WeatherIcon },
    { id: 'profile', href: profileHref(account), label: account ? 'Profile' : 'Log in', icon: ProfileIcon },
  );

  return (
    <nav
      aria-label="Tabs"
      className="hub-bar tab-bar fixed inset-x-0 bottom-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {tabs.map((tab) => {
          const on = current === tab.id;
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="flex flex-1">
              <Link
                href={tab.href}
                aria-current={on ? 'page' : undefined}
                className={`ui-press flex flex-1 flex-col items-center justify-center gap-0.5 no-underline ${on ? 'text-[#ffd700] shadow-[inset_0_3px_0_#ffd700]' : 'text-white'}`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-bold uppercase tracking-wide">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
