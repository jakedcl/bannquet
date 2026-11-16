'use client';

import { useState } from 'react';

export function SnowRemoteImage({ src, alt, sourceUrl }: { src: string; alt: string; sourceUrl: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <p className="border border-[#5c3a1e]/25 bg-white/60 p-3 text-sm">
      Graphic unavailable. <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">View the official forecast</a>.
    </p>
  );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="max-w-full border border-[#5c3a1e]/30 bg-white" onError={() => setFailed(true)} />;
}
