'use client';

import { HIDDEN_END_METERS } from '@/lib/route-privacy';

/**
 * Owner-only switch for a route's privacy ends. Controlled, so a failed save
 * (which resets uncontrolled fields) can't quietly turn it back off.
 */
export function HideEndsToggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="hideEnds"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Hide the start and end ({HIDDEN_END_METERS} m each) from others
    </label>
  );
}
