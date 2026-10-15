'use client';

import { useActionState } from 'react';

type Action = (
  state: { error?: string } | null,
  formData: FormData,
) => Promise<{ error?: string }>;

export function TrashButton({
  pending = false,
  label = 'Delete',
  name,
  value,
  onClick,
}: {
  pending?: boolean;
  label?: string;
  name?: string;
  value?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={onClick}
      className="retro-button-yellow inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-none p-0 disabled:opacity-60"
    >
      <TrashIcon />
    </button>
  );
}

export function ConfirmDelete({
  action,
  confirm,
  fields,
}: {
  action: Action;
  confirm: string;
  fields: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className="relative shrink-0"
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state?.error ? (
        <p className="absolute right-0 top-full z-10 mt-1 w-44 text-right text-xs font-bold text-red-700">{state.error}</p>
      ) : null}
      <TrashButton pending={pending} />
    </form>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2.5 3.5h9" />
      <path d="M5 3.5V2.5h4v1" />
      <path d="M3.5 3.5l.6 8h5.8l.6-8" />
      <path d="M6 6v3.5M8 6v3.5" />
    </svg>
  );
}
