import { areaCoversPoint, type OfflineAreaRecord } from './offline';

export function effectivelyOffline(navigatorOnLine: boolean, networkReachable: boolean): boolean {
  return !navigatorOnLine || !networkReachable;
}

export type StartScreenUi = {
  showPickMap: boolean;
  showSaveOffline: boolean;
  showOfflineBadge: boolean;
  showSavedAreasList: boolean;
};

export function startScreenUi(effectivelyOfflineMode: boolean, savedAreaCount: number): StartScreenUi {
  if (!effectivelyOfflineMode) {
    return {
      showPickMap: true,
      showSaveOffline: true,
      showOfflineBadge: false,
      showSavedAreasList: false,
    };
  }
  return {
    showPickMap: false,
    showSaveOffline: false,
    showOfflineBadge: true,
    showSavedAreasList: savedAreaCount > 0,
  };
}

export function findCoveringArea(
  areas: readonly OfflineAreaRecord[],
  lat: number,
  lng: number,
): OfflineAreaRecord | null {
  for (const area of areas) {
    if (areaCoversPoint(area, lat, lng)) return area;
  }
  return null;
}

export type OfflineExploreResult = 'proceed' | 'outside';

/** When online, always proceed; when offline, require a saved area covering the fix. */
export function offlineExploreCheck(
  areas: readonly OfflineAreaRecord[],
  lat: number,
  lng: number,
  isOffline: boolean,
): OfflineExploreResult {
  if (!isOffline) return 'proceed';
  return findCoveringArea(areas, lat, lng) ? 'proceed' : 'outside';
}

export const OFFLINE_GEO_TIMEOUT_MS = 30_000;
export const ONLINE_GEO_TIMEOUT_MS = 12_000;
