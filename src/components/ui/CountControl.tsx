'use client';

import type { ReactNode } from 'react';
import { SubmitButton } from '@/components/ui/SubmitButton';

type Step = {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
};

export function CountControl({
  count,
  zeroLabel,
  addLabel,
  removeLabel,
  add,
  remove,
  children,
}: {
  count: number;
  zeroLabel: string;
  addLabel: string;
  removeLabel: string;
  add: Step;
  remove: Step;
  children?: ReactNode;
}) {
  if (count < 1) {
    return (
      <form action={add.action} onClick={stop} onKeyDown={stop}>
        <Fields fields={add.fields} />
        <SubmitButton tone="yellow" pendingLabel="Saving…" className="px-3 py-2 text-xs">
          {zeroLabel}
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="inline-flex items-center gap-2" onClick={stop} onKeyDown={stop}>
      {children ? <p className="text-sm font-bold">{children}</p> : null}
      <form action={remove.action}>
        <Fields fields={remove.fields} />
        <SubmitButton icon tone="yellow" pendingLabel="Saving…" ariaLabel={removeLabel}>
          −
        </SubmitButton>
      </form>
      {children ? null : <p className="min-w-4 text-center text-sm font-bold">{count}</p>}
      <form action={add.action}>
        <Fields fields={add.fields} />
        <SubmitButton icon tone="yellow" pendingLabel="Saving…" ariaLabel={addLabel}>
          +
        </SubmitButton>
      </form>
    </div>
  );
}

function Fields({ fields }: { fields: Record<string, string> }) {
  return Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));
}

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
