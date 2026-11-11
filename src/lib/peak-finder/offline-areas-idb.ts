import { OFFLINE_AREAS_STORE, OFFLINE_DB_NAME } from './constants';
import type { OfflineAreaRecord } from './offline';
import { findCoveringArea } from './start-screen-offline';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_AREAS_STORE)) {
        db.createObjectStore(OFFLINE_AREAS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(OFFLINE_AREAS_STORE, mode);
        const store = tx.objectStore(OFFLINE_AREAS_STORE);
        const request = run(store);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      }),
  );
}

export async function listOfflineAreas(): Promise<OfflineAreaRecord[]> {
  if (typeof indexedDB === 'undefined') return [];
  return withStore('readonly', (store) => store.getAll());
}

export async function saveOfflineArea(area: OfflineAreaRecord): Promise<void> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available.');
  await withStore('readwrite', (store) => store.put(area));
}

export async function deleteOfflineArea(id: string): Promise<OfflineAreaRecord | null> {
  if (typeof indexedDB === 'undefined') return null;
  const existing = await withStore<OfflineAreaRecord | undefined>('readonly', (store) => store.get(id));
  if (!existing) return null;
  await withStore('readwrite', (store) => store.delete(id));
  return existing;
}

export function findAreaCovering(
  areas: readonly OfflineAreaRecord[],
  lat: number,
  lng: number,
): OfflineAreaRecord | null {
  return findCoveringArea(areas, lat, lng);
}
