'use client';

import { useCallback, useEffect, useState } from 'react';
import { OFFLINE_RADIUS_M, PEAKS_CACHE, TERRAIN_CACHE } from '@/lib/peak-finder/constants';
import {
  defaultAreaName,
  downloadOfflineData,
  formatOfflineSize,
  offlineManifestFor,
  type OfflineAreaRecord,
} from '@/lib/peak-finder/offline';
import {
  deleteOfflineArea,
  listOfflineAreas,
  saveOfflineArea,
} from '@/lib/peak-finder/offline-areas-idb';
import { MAP_CENTER } from '@/lib/map';
import type { Spot } from '@/lib/peak-finder/location';
import { SpotPicker } from './SpotPicker';

type OfflineStep = 'hub' | 'choose' | 'map' | 'confirm' | 'downloading' | 'done';

type Props = {
  onBack: () => void;
  onSaved: () => void;
};

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `area-${Date.now()}`;
}

export function PeakFinderOffline({ onBack, onSaved }: Props) {
  const [step, setStep] = useState<OfflineStep>('hub');
  const [areas, setAreas] = useState<OfflineAreaRecord[]>([]);
  const [spot, setSpot] = useState<Spot>(MAP_CENTER);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [savedArea, setSavedArea] = useState<OfflineAreaRecord | null>(null);

  const refresh = useCallback(() => {
    void listOfflineAreas().then(setAreas);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const manifest = offlineManifestFor(spot.lat, spot.lng);

  async function chooseCurrentLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.');
      return;
    }
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15_000,
        });
      });
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setSpot(next);
      setName(defaultAreaName(next.lat, next.lng));
      setStep('confirm');
    } catch {
      setError('Could not read your location. Allow access or drop a pin on the map.');
    }
  }

  async function runDownload() {
    setStep('downloading');
    setError(null);
    setProgress({ done: 0, total: 1 });
    try {
      const { terrainUrls, peakUrls } = await downloadOfflineData(spot.lat, spot.lng, setProgress);
      const record: OfflineAreaRecord = {
        id: newId(),
        name: name.trim() || defaultAreaName(spot.lat, spot.lng),
        lat: spot.lat,
        lng: spot.lng,
        radiusM: OFFLINE_RADIUS_M,
        savedAt: new Date().toISOString(),
        terrainUrls,
        peakUrls,
      };
      await saveOfflineArea(record);
      setSavedArea(record);
      setStep('done');
      refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
      setStep('confirm');
    }
  }

  async function removeArea(id: string) {
    setError(null);
    const removed = await deleteOfflineArea(id);
    if (!removed) {
      refresh();
      return;
    }
    try {
      const terrain = await caches.open(TERRAIN_CACHE);
      const peaks = await caches.open(PEAKS_CACHE);
      await Promise.all(removed.terrainUrls.map((url) => terrain.delete(url)));
      await Promise.all(removed.peakUrls.map((url) => peaks.delete(url)));
    } catch {
      /* Shared tiles may remain — acceptable */
    }
    refresh();
  }

  if (step === 'map') {
    return (
      <div className="flex h-full flex-col bg-[#e7e1d4] text-[#1a1a1a]">
        <div className="relative min-h-0 flex-1">
          <SpotPicker lat={spot.lat} lng={spot.lng} onBack={() => setStep('choose')} onChange={setSpot} />
        </div>
        <div className="flex flex-col gap-2 border-t-2 border-[#5c3a1e] p-3">
          <button
            type="button"
            className="retro-button retro-button-yellow min-h-11 w-full px-3 text-sm"
            onClick={() => {
              setName(defaultAreaName(spot.lat, spot.lng));
              setStep('confirm');
            }}
          >
            Use this pin
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm' || step === 'downloading') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#e7e1d4] px-6 text-center text-[#1a1a1a]">
        <h2 className="text-lg font-bold text-[#2d5016]">Save area for offline</h2>
        <p className="max-w-sm text-sm">
          {OFFLINE_RADIUS_M / 1000} km radius around{' '}
          <span className="font-bold">{spot.lat.toFixed(3)}°, {spot.lng.toFixed(3)}°</span>
        </p>
        <label className="flex w-full max-w-sm flex-col gap-1 text-left text-xs font-bold">
          Area name
          <input
            type="text"
            className="retro-inset min-h-10 px-2 text-sm font-normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={step === 'downloading'}
          />
        </label>
        <p className="text-sm">
          Estimated download:{' '}
          <span className="font-bold">{formatOfflineSize(manifest.estimatedBytes)}</span>
          {' '}
          ({manifest.tileCount} terrain tiles, {manifest.chunkCount} peak lists)
        </p>
        {step === 'downloading' && progress ? (
          <div className="w-full max-w-sm">
            <div className="retro-inset h-4 overflow-hidden">
              <div
                className="h-full bg-[#2d5016] transition-all"
                style={{ width: `${Math.round((100 * progress.done) / Math.max(1, progress.total))}%` }}
              />
            </div>
            <p className="mt-1 text-xs">
              {progress.done} / {progress.total}
            </p>
          </div>
        ) : (
          <div className="flex w-full max-w-sm flex-col gap-2">
            <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={() => void runDownload()}>
              Download
            </button>
            <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={() => setStep('choose')}>
              Back
            </button>
          </div>
        )}
        {error ? <p className="max-w-sm text-sm font-bold text-red-900">{error}</p> : null}
      </div>
    );
  }

  if (step === 'done' && savedArea) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#e7e1d4] px-6 text-center text-[#1a1a1a]">
        <h2 className="text-lg font-bold text-[#2d5016]">Saved — ready offline</h2>
        <p className="max-w-sm text-sm leading-snug">
          <span className="font-bold">{savedArea.name}</span>
          <br />
          {savedArea.lat.toFixed(3)}°, {savedArea.lng.toFixed(3)}°
          <br />
          {new Date(savedArea.savedAt).toLocaleString()}
        </p>
        <p className="max-w-sm text-xs leading-snug text-[#3d3d3d]">
          On iPhone, Add to Home Screen helps Safari keep this data longer.
        </p>
        <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={onBack}>
          Done
        </button>
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#e7e1d4] px-6 text-center text-[#1a1a1a]">
        <h2 className="text-lg font-bold text-[#2d5016]">Choose area center</h2>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={() => void chooseCurrentLocation()}>
            Use my current location
          </button>
          <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={() => setStep('map')}>
            Drop a pin on the map
          </button>
          <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={() => setStep('hub')}>
            Back
          </button>
        </div>
        {error ? <p className="max-w-sm text-sm font-bold text-red-900">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-[#e7e1d4] px-6 py-6 text-[#1a1a1a]">
      <div className="text-center">
        <h2 className="text-lg font-bold text-[#2d5016]">Offline mode</h2>
        <p className="mt-2 text-sm leading-snug">
          Save terrain and peak names for a 100 km area, then use Peak Finder with no signal.
        </p>
        <p className="mt-2 text-xs text-[#3d3d3d]">Tip: on iPhone, Add to Home Screen keeps saved data longer.</p>
      </div>
      <button type="button" className="retro-button retro-button-yellow min-h-11 w-full text-sm" onClick={() => setStep('choose')}>
        Save area for offline
      </button>
      {areas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {areas.map((area) => (
            <li key={area.id} className="retro-box flex flex-col gap-2 p-3 text-left text-sm">
              <span className="font-bold">{area.name}</span>
              <span className="text-xs">
                {area.lat.toFixed(3)}°, {area.lng.toFixed(3)}° — {new Date(area.savedAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                className="retro-button min-h-9 self-start px-3 text-xs"
                onClick={() => void removeArea(area.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-[#3d3d3d]">No saved areas yet.</p>
      )}
      <button type="button" className="retro-button min-h-11 w-full text-sm" onClick={onBack}>
        Back to start
      </button>
      {error ? <p className="text-sm font-bold text-red-900">{error}</p> : null}
    </div>
  );
}
