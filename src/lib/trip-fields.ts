export type TripFields = { title: string; tripDate: string; notes: string };

/** Shared by new trips and trip edits. */
export function cleanTripFields(raw: { title: unknown; tripDate: unknown; notes: unknown }): { error: string } | { fields: TripFields } {
  const title = String(raw.title ?? '').trim();
  const tripDate = String(raw.tripDate ?? '').trim();
  const notes = String(raw.notes ?? '').trim().slice(0, 4000);
  if (!title || title.length > 80) return { error: 'Give the trip a short name.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tripDate) || Number.isNaN(Date.parse(`${tripDate}T00:00:00Z`))) return { error: 'Pick a date.' };
  return { fields: { title, tripDate, notes } };
}
