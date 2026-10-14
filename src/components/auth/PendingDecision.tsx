'use client';

import { useActionState } from 'react';
import { approveMember, denyMember } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';

export function PendingDecision({ userId }: { userId: string }) {
  const [approveState, approve, approvePending] = useActionState(approveMember, null);
  const [denyState, deny, denyPending] = useActionState(denyMember, null);
  const error = approveState?.error || denyState?.error;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <form action={approve}>
          <input type="hidden" name="userId" value={userId} />
          <Button tone="green" type="submit" disabled={approvePending || denyPending}>
            {approvePending ? 'Approving…' : 'Approve'}
          </Button>
        </form>
        <form action={deny}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" disabled={approvePending || denyPending}>
            {denyPending ? 'Removing…' : 'Deny'}
          </Button>
        </form>
      </div>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
