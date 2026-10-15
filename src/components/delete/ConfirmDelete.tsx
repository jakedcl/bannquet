'use client';

import { useActionState } from 'react';
import { Button, type ButtonTone } from '@/components/retro/Button';

type Action = (
  state: { error?: string } | null,
  formData: FormData,
) => Promise<{ error?: string }>;

export function ConfirmDelete({
  action,
  label,
  confirm,
  fields,
  tone = 'default',
}: {
  action: Action;
  label: string;
  confirm: string;
  fields: Record<string, string>;
  tone?: ButtonTone;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending} tone={tone}>{pending ? 'Deleting…' : label}</Button>
    </form>
  );
}
