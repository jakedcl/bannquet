/** Whether Sanity `_updatedAt` is newer than the rev we stored on the last import. */
export function sanityRevIsNewer(storedRev: string | null | undefined, updatedAt: string): boolean {
  if (!storedRev) return true;
  const storedMs = Date.parse(storedRev);
  const nextMs = Date.parse(updatedAt);
  if (!Number.isFinite(storedMs) || !Number.isFinite(nextMs)) return storedRev !== updatedAt;
  return nextMs > storedMs;
}