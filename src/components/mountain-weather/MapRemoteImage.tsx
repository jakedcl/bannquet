'use client';

import { useState } from 'react';

export function MapRemoteImage({
  src,
  alt,
  expectedOk,
}: {
  src: string;
  alt: string;
  expectedOk: boolean;
}) {
  const [failed, setFailed] = useState(!expectedOk);

  if (failed) {
    return (
      <p className="border border-red-800 bg-red-50 p-2 text-sm font-bold text-red-900">
        Image did not load ({alt}). URL checked: {expectedOk ? 'HTTP 200 at fetch time — try again' : 'HTTP not OK when resolved'} ·{' '}
        <a href={src} className="underline" target="_blank" rel="noopener noreferrer">
          Open URL
        </a>
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="max-w-full border border-[#5c3a1e]/30 bg-white"
      onError={() => setFailed(true)}
    />
  );
}