'use client';

import { useRef } from 'react';

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder,
  label = 'Search',
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      role="search"
      className="flex items-stretch"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch?.(inputRef.current?.value ?? value);
        inputRef.current?.blur();
      }}
    >
      <label className="sr-only">{label}</label>
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 retro-box-inset bg-white px-3 py-2 text-sm max-md:px-2 max-md:py-1"
      />
      <button
        type="submit"
        aria-label="Search"
        className="retro-button-yellow inline-flex items-center justify-center rounded-none px-3 max-md:!px-2 max-md:!py-1"
      >
        <SearchIcon />
      </button>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 max-md:h-3.5 max-md:w-3.5" aria-hidden="true">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 104.227 9.027l2.873 2.873a.75.75 0 101.06-1.06l-2.873-2.874A5.5 5.5 0 009 3.5zM5 9a4 4 0 118 0 4 4 0 01-8 0z" clipRule="evenodd" />
    </svg>
  );
}
