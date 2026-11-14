export type PostFields = { title: string; body: string };

/** Shared by new posts and post edits. */
export function cleanPostFields(raw: { title: unknown; body: unknown }): { error: string } | { fields: PostFields } {
  const title = String(raw.title ?? '').trim();
  const body = String(raw.body ?? '').trim().slice(0, 8000);
  if (!title || title.length > 120) return { error: 'Give the post a short title.' };
  if (!body) return { error: 'Write something for the post body.' };
  return { fields: { title, body } };
}
