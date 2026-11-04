'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/hub/Card';
import { HubButton, hubButtonClass } from '@/components/hub/Button';
import { HubPage } from '@/components/hub/Page';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-frame mt-[var(--bar-h)] min-h-[calc(100dvh-var(--bar-h)-var(--tab-h))]">
      <HubPage title="Something broke" width="3xl">
        <Card>
          <p className="t-body">This page did not load. Try again in a minute.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <HubButton onClick={reset}>Try again</HubButton>
            <Link href="/" className={hubButtonClass('gray')}>Back to the map</Link>
          </div>
        </Card>
      </HubPage>
    </div>
  );
}
