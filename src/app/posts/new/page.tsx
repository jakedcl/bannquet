import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PostForm } from '@/components/posts/PostForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listMembers } from '@/lib/auth/members';
import { isDatabaseConfigured } from '@/db';
import { listAttachables, type AttachChoice } from '@/lib/library';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath('/posts/new'));
  if (!canContribute(viewer.role)) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Window title="New post">
            <p className="text-sm text-gray-700">{APPROVAL_WAIT}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  const friends = (await listMembers())
    .filter((member) => member.id !== viewer.id && canContribute(member.role))
    .map((member) => ({
      id: member.id,
      label: member.displayName || member.handle || member.email || 'Friend',
    }));
  const saved = await loadSaved(viewer.id);

  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Window title="New post">
          <p className="mb-4 text-sm text-gray-700">
            A trip report can include the day, photos, and a route.
            You can attach a route, pin, or photo you already saved, or add a new one here.
          </p>
          <PostForm friends={friends} routes={saved.routes} pins={saved.pins} photos={saved.photos} />
        </Window>
      </div>
    </PageWrapper>
  );
}

async function loadSaved(userId: string): Promise<{ routes: AttachChoice[]; pins: AttachChoice[]; photos: AttachChoice[] }> {
  const empty = { routes: [], pins: [], photos: [] };
  if (!isDatabaseConfigured()) return empty;
  try {
    return await listAttachables(userId);
  } catch {
    return empty;
  }
}
