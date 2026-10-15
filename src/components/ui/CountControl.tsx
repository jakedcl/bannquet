'use client';

import type { ReactNode } from 'react';

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
        <button type="submit" className="retro-button-yellow rounded-none px-3 py-2 text-xs font-bold uppercase">
          {zeroLabel}
        </button>
      </form>
    );
  }

  return (
    <div className="inline-flex items-center gap-2" onClick={stop} onKeyDown={stop}>
      {children ? <p className="text-sm font-bold">{children}</p> : null}
      <form action={remove.action}>
        <Fields fields={remove.fields} />
        <button
          type="submit"
          aria-label={removeLabel}
          className="retro-button-yellow inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none p-0 text-lg font-bold"
        >
          −
        </button>
      </form>
      {children ? null : <p className="min-w-4 text-center text-sm font-bold">{count}</p>}
      <form action={add.action}>
        <Fields fields={add.fields} />
        <button
          type="submit"
          aria-label={addLabel}
          className="retro-button-yellow inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none p-0 text-lg font-bold"
        >
          +
        </button>
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
