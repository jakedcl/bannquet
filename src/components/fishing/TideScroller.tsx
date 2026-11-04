'use client';

import type { ReactNode } from 'react';
import { smallButtonClass } from '@/components/hub/Button';

export function TideScroller({
  days,
  children,
}: {
  days: { id: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <div>
      {days.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-2 pt-2 md:hidden" role="group" aria-label="Day">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              className={smallButtonClass}
              onClick={() => {
                document.getElementById(day.id)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
              }}
            >
              {day.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
