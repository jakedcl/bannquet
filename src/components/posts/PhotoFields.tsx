'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { preparePhoto, type UploadedPhoto } from '@/components/posts/prepare-photo';
import { FileInput } from '@/components/ui/FileInput';

const GroupMap = dynamic(() => import('@/components/map/GroupMap'), { ssr: false });

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

export function PhotoFields({
  photos,
  onChange,
  onBusy,
  requireLocation = true,
  showLocation = true,
}: {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  onBusy?: (busy: boolean) => void;
  requireLocation?: boolean;
  showLocation?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinning, setPinning] = useState<number | null>(null);
  const missing = showLocation && requireLocation && photos.some((photo) => photo.lat == null || photo.lng == null);

  function setWorking(next: boolean) {
    setBusy(next);
    onBusy?.(next);
  }

  async function addFiles(list: File[]) {
    if (list.length === 0) return;
    setWorking(true);
    setError(null);
    const next = [...photos];
    try {
      for (const file of list) {
        if (!file.type.startsWith('image/')) {
          setError('Use a photo file, like a JPG or PNG.');
          continue;
        }
        next.push(await preparePhoto(file));
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That photo did not upload.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="block text-sm font-bold">Photos</span>
        <FileInput
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(files) => { void addFiles(files); }}
        />
      </div>
      {busy ? <p className="text-sm">Working on the photos…</p> : null}
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      <input
        type="hidden"
        name="photos"
        value={JSON.stringify(photos.map((photo) => ({
          url: photo.url,
          thumbUrl: photo.thumbUrl,
          width: photo.width,
          height: photo.height,
          lat: photo.lat,
          lng: photo.lng,
          source: photo.source,
        })))}
      />
      <div className="space-y-3">
        {photos.map((photo, index) => {
          const located = photo.lat != null && photo.lng != null;
          return (
            <div key={photo.url} className="flex gap-3 bg-white p-2 retro-box-inset">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="" className="h-16 w-16 object-cover" />
              <div className="min-w-0 flex-1 space-y-1">
                {showLocation && requireLocation && !located ? (
                  <p className="text-xs font-bold text-red-700">
                    This photo has no location. Drop a pin on the map, or remove it.
                  </p>
                ) : null}
                <div className="flex gap-2">
                  {showLocation ? (
                    <button type="button" className="text-xs font-bold uppercase underline" onClick={() => setPinning(index)}>
                      {located ? 'Move pin' : 'Drop a pin'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs font-bold uppercase underline"
                    onClick={() => onChange(photos.filter((_, item) => item !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showLocation && (missing || pinning != null) ? (
        <div className="h-64 overflow-hidden retro-box">
          <GroupMap
            points={EMPTY}
            lines={EMPTY}
            picking
            onPick={(lng, lat) => {
              if (pinning == null) {
                const index = photos.findIndex((photo) => photo.lat == null);
                if (index < 0) return;
                const next = photos.slice();
                const current = next[index];
                if (!current) return;
                next[index] = { ...current, lng, lat, source: 'manual' };
                onChange(next);
                setPinning(null);
                return;
              }
              const next = photos.slice();
              const current = next[pinning];
              if (!current) return;
              next[pinning] = { ...current, lng, lat, source: 'manual' };
              onChange(next);
              setPinning(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
