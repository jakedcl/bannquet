'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { attachToReportAction, detachFromReportAction } from '@/app/library/actions';
import { Button } from '@/components/retro/Button';

export function SeeMore({ post }: { post: { id: string; title: string } | null }) {
  if (!post) return null;
  return (
    <p className="text-sm">
      See more at <Link href={`/posts/${post.id}`} className="underline">{post.title}</Link>
    </p>
  );
}

export function AttachReport({
  kind,
  entityId,
  reports,
  attached,
  returnTo,
}: {
  kind: 'route' | 'pin' | 'photo';
  entityId: string;
  reports: Array<{ id: string; title: string }>;
  attached: boolean;
  returnTo: string;
}) {
  const [attachState, attach, attachPending] = useActionState(attachToReportAction, null);
  const [detachState, detach, detachPending] = useActionState(detachFromReportAction, null);

  return (
    <div className="space-y-3">
      {attached ? (
        <form action={detach} className="space-y-2">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="entityId" value={entityId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          {detachState?.error ? <p className="text-sm font-bold text-red-700">{detachState.error}</p> : null}
          <Button type="submit" disabled={detachPending}>{detachPending ? 'Detaching…' : 'Detach'}</Button>
        </form>
      ) : reports.length === 0 ? (
        <p className="text-sm">Write a trip report first, then you can attach this.</p>
      ) : (
        <form action={attach} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="entityId" value={entityId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="text-sm font-bold" htmlFor={`report-${entityId}`}>Attach to trip report</label>
          <select id={`report-${entityId}`} name="reportId" className="retro-box-inset bg-white px-2 py-1 text-sm">
            {reports.map((report) => (
              <option key={report.id} value={report.id}>{report.title}</option>
            ))}
          </select>
          <Button type="submit" tone="yellow" disabled={attachPending}>{attachPending ? 'Attaching…' : 'Attach'}</Button>
          {attachState?.error ? <p className="w-full text-sm font-bold text-red-700">{attachState.error}</p> : null}
        </form>
      )}
    </div>
  );
}
