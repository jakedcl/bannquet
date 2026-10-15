import PageWrapper from '@/components/ui/PageWrapper';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listChatMessages } from '@/lib/chat';
import { listAttachables } from '@/lib/library';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const viewer = await getViewer();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so chat cannot load.';
  let messages: Awaited<ReturnType<typeof listChatMessages>> = [];
  let items = { pins: [] as Array<{ id: string; label: string; url?: string }>, routes: [] as Array<{ id: string; label: string }>, photos: [] as Array<{ id: string; label: string; url?: string }> };

  if (ready) {
    try {
      messages = await listChatMessages();
      if (viewer && canContribute(viewer.role)) {
        const saved = await listAttachables(viewer.id);
        items = {
          pins: saved.pins.map((item) => ({ id: item.id, label: item.label })),
          routes: saved.routes.map((item) => ({ id: item.id, label: item.label })),
          photos: saved.photos.map((item) => ({ id: item.id, label: item.label, url: item.url })),
        };
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Chat did not load.';
    }
  }

  const canSend = Boolean(viewer && canContribute(viewer.role) && !error);
  const notice = error ?? (viewer && !canContribute(viewer.role) ? APPROVAL_WAIT : !viewer ? 'Sign in to talk.' : null);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Chat">
          <p className="mb-3 text-sm text-gray-700">
            One thread for the group. Text only. Trip reports stay on their own pages.
          </p>
          <ChatRoom initial={messages} canSend={canSend} notice={notice} items={items} />
        </Window>
      </div>
    </PageWrapper>
  );
}
