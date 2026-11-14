'use client';

import { useState, type ReactNode } from 'react';

export type ProfileTab = {
  id: string;
  label: string;
  content: ReactNode;
  show: boolean;
};

export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const visible = tabs.filter((tab) => tab.show);
  const [active, setActive] = useState(visible[0]?.id ?? '');
  const current = visible.find((tab) => tab.id === active) ?? visible[0];

  if (visible.length === 0) return null;

  return (
    <div className="space-y-4">
      <nav aria-label="Profile sections" className="flex flex-wrap gap-2 border-b border-[#d9d2c5] pb-2">
        {visible.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            aria-current={current?.id === tab.id ? 'true' : undefined}
            className={`min-h-11 px-3 text-sm font-bold uppercase ${current?.id === tab.id ? 'bg-brand-green text-white' : 'underline'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {current?.content}
    </div>
  );
}
