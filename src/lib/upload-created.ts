'use client';

import { useEffect } from 'react';
import type { DraftItem } from '@/lib/trip-draft';

/** Inline upload dialogs report new pins, routes, or photos back to the parent form. */
export function useReportCreated(
  inline: boolean,
  created: DraftItem[] | undefined,
  onCreated?: (items: DraftItem[]) => void,
) {
  useEffect(() => {
    if (!inline || !created?.length || !onCreated) return;
    onCreated(created);
  }, [inline, created, onCreated]);
}
