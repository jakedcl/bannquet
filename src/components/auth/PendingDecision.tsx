'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { approveMember, denyMember } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';
import { Table } from '@/components/retro/Table';
import { Window } from '@/components/retro/Window';

export type PendingMember = {
  id: string;
  displayName: string | null;
  email: string | null;
  handle: string | null;
};

export function PendingQueue({ members }: { members: PendingMember[] }) {
  const [removed, setRemoved] = useState<string[]>([]);
  const waiting = members.filter((member) => !removed.includes(member.id));

  return (
    <Window title={waiting.length > 0 ? `Waiting (${waiting.length})` : 'Waiting'}>
      {waiting.length === 0 ? (
        <p className="text-sm">Nobody is waiting for approval.</p>
      ) : (
        <Table
          headers={['Name', 'Email', 'Username', 'Decision']}
          rows={waiting.map((member) => [
            member.displayName || 'Friend',
            member.email ?? '—',
            member.handle ? `@${member.handle}` : '—',
            <PendingDecision
              key={member.id}
              userId={member.id}
              onDone={() => setRemoved((ids) => (ids.includes(member.id) ? ids : [...ids, member.id]))}
            />,
          ])}
        />
      )}
    </Window>
  );
}

function PendingDecision({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [approveState, approve, approvePending] = useActionState(approveMember, null);
  const [denyState, deny, denyPending] = useActionState(denyMember, null);
  const error = approveState?.error || denyState?.error;
  const finished = Boolean((approveState && !approveState.error) || (denyState && !denyState.error));
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (finished) onDoneRef.current();
  }, [finished]);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <form action={approve}>
          <input type="hidden" name="userId" value={userId} />
          <Button tone="green" type="submit" disabled={approvePending || denyPending || finished}>
            {approvePending ? 'Approving…' : 'Approve'}
          </Button>
        </form>
        <form action={deny}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" disabled={approvePending || denyPending || finished}>
            {denyPending ? 'Removing…' : 'Deny'}
          </Button>
        </form>
      </div>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
