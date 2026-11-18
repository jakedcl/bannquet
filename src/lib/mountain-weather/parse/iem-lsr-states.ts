/** States included in Bannquet's Northeast mountain weather scope. */
export const NORTHEAST_LSR_STATES = new Set(['NY', 'VT', 'NH', 'ME', 'MA']);

export function isNortheastLsrState(state: string | null | undefined): boolean {
  if (!state) return false;
  return NORTHEAST_LSR_STATES.has(state.trim().toUpperCase());
}