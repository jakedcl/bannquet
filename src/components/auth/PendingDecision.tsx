'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { approveMember, denyMember } from '@/app/sign-in/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { BrowseTable } from '@/components/ui/BrowseTable';
import type { DataColumn } from '@/components/ui/DataTable';
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
        <PendingTable
          members={waiting}
          onDone={(id) => setRemoved((ids) => (ids.includes(id) ? ids : [...ids, id]))}
        />
      )}
    </Window>
  );
}

function PendingTable({ members, onDone }: { members: PendingMember[]; onDone: (id: string) => void }) {
  const columns: DataColumn<PendingMember>[] = [
    {
      id: 'name',
      header: 'Name',
      sticky: true,
      sortValue: (row) => row.displayName || 'Friend',
      cell: (row) => row.displayName || 'Friend',
    },
    {
      id: 'email',
      header: 'Email',
      sortValue: (row) => row.email,
      cell: (row) => row.email ?? '—',
    },
    {
      id: 'username',
      header: 'Username',
      sortValue: (row) => row.handle,
      cell: (row) => (row.handle ? `@${row.handle}` : '—'),
    },
    {
      id: 'decision',
      header: 'Decision',
      sortValue: () => null,
      cell: (row) => <PendingDecision userId={row.id} onDone={() => onDone(row.id)} />,
    },
  ];
  return (
    <BrowseTable
      rows={members}
      columns={columns}
      rowKey={(row) => row.id}
      empty="Nobody is waiting for approval."
      defaultSort={{ id: 'name', dir: 'asc' }}
      placeholder="Name, email, or username"
      searchText={(row) => `${row.displayName ?? ''} ${row.email ?? ''} ${row.handle ?? ''}`}
      collapsed
    />
  );
}

function PendingDecision({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [approveState, approve, approvePending] = useActionState(approveMember, null);
  const [denyState, deny, denyPending] = useActionState(denyMember, null);
  const error = approveState?.error || denyState?.error;
  const finished = Boolean((approveState && !approveState.error) || (denyState && !denyState.error));
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (finished) onDoneRef.current();
  }, [finished]);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <form action={approve}>
          <input type="hidden" name="userId" value={userId} />
          <SubmitButton tone="green" pendingLabel="Approving…" disabled={denyPending || finished}>
            Approve
          </SubmitButton>
        </form>
        <form action={deny}>
          <input type="hidden" name="userId" value={userId} />
          <SubmitButton pendingLabel="Removing…" disabled={approvePending || finished}>
            Deny
          </SubmitButton>
        </form>
      </div>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
