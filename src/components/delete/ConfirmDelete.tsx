'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/SubmitButton';

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
    <SubmitButton
      icon
      tone="yellow"
      pendingLabel="Deleting…"
      ariaLabel={label}
      title={label}
      name={name}
      value={value}
      disabled={pending}
      onClick={onClick}
      className="h-7 w-7 text-base"
    >
      <TrashIcon />
    </SubmitButton>
  );
}

export function ConfirmDelete({
  action,
  confirm,
  fields,
  label,
}: {
  action: Action;
  confirm: string;
  fields: Record<string, string>;
  /** Screen-reader name. Defaults to the confirm question, e.g. "Delete this route". */
  label?: string;
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
      <TrashButton pending={pending} label={label ?? confirm.replace(/\?$/, '')} />
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
