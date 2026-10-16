'use client';

import { useEffect, useRef } from 'react';
import type { DraftItem } from '@/lib/trip-draft';

export function useReportCreated(
  inline: boolean,
  created: DraftItem[] | undefined,
  onCreated?: (items: DraftItem[]) => void,
) {
  const onCreatedRef = useRef(onCreated);
  const reported = useRef('');

  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated]);

  useEffect(() => {
    if (!inline || !created?.length) return;
    const key = created.map((item) => `${item.kind}:${item.id}`).join(',');
    if (reported.current === key) return;
    reported.current = key;
    onCreatedRef.current?.(created);
  }, [created, inline]);
}
