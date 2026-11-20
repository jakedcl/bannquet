'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/hub/Card';
import { Button, buttonClass } from '@/components/hub/Button';
import { HubPage } from '@/components/hub/Page';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-frame mt-[var(--bar-h)] min-h-[calc(100dvh-var(--bar-h))]">
      <HubPage title="Something broke" width="3xl">
        <Card>
          <p className="t-body">This page did not load. Try again in a minute.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button kind="yellow" onClick={reset}>Try again</Button>
            <Link href="/" className={buttonClass('gray')}>Back to Home</Link>
          </div>
        </Card>
      </HubPage>
    </div>
  );
}
