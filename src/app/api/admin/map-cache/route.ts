import { getViewer } from '@/app/sign-in/actions';
import { bumpMapCache, MAP_TAG } from '@/lib/posts';

/** Admin-only: refresh the cached public map after a Tomvanz sync (or call bumpMapCache from the sync script in-process). */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== 'admin') {
    return Response.json({ error: 'Only Jake can do that.' }, { status: 403 });
  }
  bumpMapCache();
  return Response.json({ ok: true, tag: MAP_TAG });
}