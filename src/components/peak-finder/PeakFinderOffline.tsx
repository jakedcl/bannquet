'use client';

import { useCallback, useEffect, useState } from 'react';
import { OFFLINE_RADIUS_M, PEAKS_CACHE, TERRAIN_CACHE } from '@/lib/peak-finder/constants';
import {
  defaultAreaName,
  downloadOfflineData,
  suggestAreaName,
  type OfflineAreaRecord,
} from '@/lib/peak-finder/offline';
import {
  deleteOfflineArea,
  listOfflineAreas,
  saveOfflineArea,
} from '@/lib/peak-finder/offline-areas-idb';
import { MAP_CENTER } from '@/lib/map';
import type { Spot } from '@/lib/peak-finder/location';
import { OfflineAreaPicker } from './OfflineAreaPicker';
import { PeakFinderBackButton } from './PeakFinderBackButton';

type OfflineStep = 'hub' | 'map' | 'downloading';

type Props = {
  onBack: () => void;
  onSaved: () => void;
  onOpenSkyline: (spot: Spot) => void;
  onSaveComplete: () => void;
  canSaveNewArea?: boolean;
};

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `area-${Date.now()}`;
}

const OFFLINE_USE_HINT =
  'With no signal, open Peak Finder and tap Explore my current location while you are inside this saved area.';

export function PeakFinderOffline({ onBack, onSaved, onOpenSkyline, onSaveComplete, canSaveNewArea = true }: Props) {
  const [step, setStep] = useState<OfflineStep>('hub');
  const [areas, setAreas] = useState<OfflineAreaRecord[]>([]);
  const [spot, setSpot] = useState<Spot>(MAP_CENTER);
  const [radiusM, setRadiusM] = useState(OFFLINE_RADIUS_M);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void listOfflineAreas().then(setAreas);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runDownload() {
    setStep('downloading');
    setError(null);
    try {
      const label = await suggestAreaName(spot.lat, spot.lng);
      const { terrainUrls, peakUrls } = await downloadOfflineData(
        spot.lat,
        spot.lng,
        () => {},
        radiusM,
      );
      const record: OfflineAreaRecord = {
        id: newId(),
        name: label.trim() || defaultAreaName(spot.lat, spot.lng),
        lat: spot.lat,
        lng: spot.lng,
        radiusM,
        savedAt: new Date().toISOString(),
        terrainUrls,
        peakUrls,
      };
      await saveOfflineArea(record);
      refresh();
      onSaved();
      onSaveComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
      setStep('map');
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

  function startNewSave() {
    setError(null);
    setRadiusM(OFFLINE_RADIUS_M);
    setSpot(MAP_CENTER);
    setStep('map');
  }

  if (step === 'map' || step === 'downloading') {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <OfflineAreaPicker
          initialLat={spot.lat}
          initialLng={spot.lng}
          radiusM={radiusM}
          onRadiusM={setRadiusM}
          onCenter={setSpot}
          onBack={() => setStep('hub')}
          downloading={step === 'downloading'}
          onDownload={() => void runDownload()}
        />
        {error ? (
          <p className="absolute inset-x-0 bottom-24 z-40 px-3 text-center text-[10px] font-bold text-red-900">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#e7e1d4] text-[#1a1a1a]">
      <PeakFinderBackButton onClick={onBack} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6 pt-12">
      <div className="text-center">
        <h2 className="text-lg font-bold text-[#2d5016]">Offline mode</h2>
        <p className="mt-2 text-sm leading-snug">
          Save terrain and peak names for an area, then use Peak Finder with no signal.
        </p>
        <p className="mt-2 text-sm leading-snug">{OFFLINE_USE_HINT}</p>
        <p className="mt-2 text-xs text-[#3d3d3d]">Tip: on iPhone, Add to Home Screen keeps saved data longer.</p>
      </div>
      {canSaveNewArea ? (
        <button type="button" className="retro-button retro-button-yellow min-h-11 w-full text-sm" onClick={startNewSave}>
          Save area for offline
        </button>
      ) : (
        <p className="text-center text-xs text-[#3d3d3d]">Connect to download a new offline area.</p>
      )}
      {areas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {areas.map((area) => (
            <li key={area.id} className="retro-box flex flex-col gap-2 p-3 text-left text-sm">
              <span className="font-bold">{area.name}</span>
              <span className="text-xs text-[#3d3d3d]">
                {area.lat.toFixed(3)}°, {area.lng.toFixed(3)}° · {Math.round(area.radiusM / 1000)} km ·{' '}
                {new Date(area.savedAt).toLocaleDateString()}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="retro-button retro-button-yellow min-h-9 px-3 text-xs"
                  onClick={() => onOpenSkyline({ lat: area.lat, lng: area.lng })}
                >
                  Open skyline
                </button>
                <button
                  type="button"
                  className="retro-button min-h-9 px-3 text-xs"
                  onClick={() => void removeArea(area.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-[#3d3d3d]">No saved areas yet.</p>
      )}
      {error ? <p className="text-sm font-bold text-red-900">{error}</p> : null}
      </div>
    </div>
  );
}
