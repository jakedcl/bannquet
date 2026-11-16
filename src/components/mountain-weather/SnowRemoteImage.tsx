'use client';

import { useEffect, useRef, useState } from 'react';

export function SnowRemoteImage({ src, alt, sourceUrl }: { src: string; alt: string; sourceUrl: string }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // A remote image can fail before React hydrates, so its error event may be missed.
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) return (
    <p className="border border-[#5c3a1e]/25 bg-white/60 p-3 text-sm">
      Graphic unavailable. <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">View the official forecast</a>.
    </p>
  );
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imageRef} src={src} alt={alt} className="max-w-full border border-[#5c3a1e]/30 bg-white" onError={() => setFailed(true)} />;
}
