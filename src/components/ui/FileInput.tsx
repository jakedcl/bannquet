'use client';

import { useState, type ChangeEvent } from 'react';
import { navButtonClass } from '@/components/ui/NavButton';

export function FileInput({
  accept,
  multiple = false,
  disabled = false,
  name,
  onChange,
}: {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  name?: string;
  onChange?: (files: File[]) => void;
}) {
  const [names, setNames] = useState<string[]>([]);
  const label = multiple ? 'Choose photos' : 'Choose file';

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setNames(files.map((file) => file.name));
    onChange?.(files);
    // The File objects are already copied. Clearing lets the same file be picked again.
    event.target.value = '';
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label className={navButtonClass(false, disabled ? 'pointer-events-none cursor-pointer opacity-60' : 'cursor-pointer')}>
        {label}
        <input
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={pick}
        />
      </label>
      <span className="min-w-0 text-sm">
        {names.length > 0 ? names.join(', ') : 'No file chosen'}
      </span>
    </div>
  );
}
