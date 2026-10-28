'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';

export type EditState = { error?: string; saved?: true } | null;
export type EditAction = (state: EditState, formData: FormData) => Promise<EditState>;

export type EditField = {
  name: string;
  label: string;
  value: string;
  kind?: 'text' | 'textarea' | 'date';
  maxLength?: number;
};

/**
 * A small edit form for the author or an admin. Fields are controlled so a
 * failed save keeps what was typed; a good save refreshes the page.
 */
export function EditForm({
  action,
  hidden,
  fields,
  inline = false,
}: {
  action: EditAction;
  hidden: Record<string, string>;
  fields: EditField[];
  /** One row, for a table cell. */
  inline?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((field) => [field.name, field.value])),
  );

  useEffect(() => {
    if (state?.saved) router.refresh();
  }, [router, state]);

  return (
    <form action={formAction} className={inline ? 'flex items-center gap-2' : 'mt-3 space-y-2'}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((field) => {
        const common = {
          name: field.name,
          value: values[field.name] ?? '',
          maxLength: field.maxLength,
          className: inline
            ? 'retro-box-inset bg-white px-2 py-1 text-sm'
            : 'w-full retro-box-inset bg-white px-3 py-2 text-base',
          'aria-label': inline ? field.label : undefined,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const next = event.target.value;
            setValues((current) => ({ ...current, [field.name]: next }));
          },
        };
        const control = field.kind === 'textarea'
          ? <textarea rows={4} {...common} />
          : <input type={field.kind === 'date' ? 'date' : 'text'} {...common} />;
        if (inline) return <span key={field.name}>{control}</span>;
        return (
          <label key={field.name} className="block space-y-1">
            <span className="text-sm font-bold">{field.label}</span>
            {control}
          </label>
        );
      })}
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.saved && !inline ? <p className="text-sm">Saved.</p> : null}
      <SubmitButton pendingLabel="Saving…" className={inline ? 'px-2 py-1 text-xs' : ''}>Save</SubmitButton>
    </form>
  );
}

/** A quiet "Edit" link that opens the form. */
export function EditDetails({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-bold underline">Edit</summary>
      {children}
    </details>
  );
}
