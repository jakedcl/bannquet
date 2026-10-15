import PageWrapper from '@/components/ui/PageWrapper';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listChatCatalog, listChatMessages, type ChatCatalogItem } from '@/lib/chat';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const viewer = await getViewer();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so chat cannot load.';
  let messages: Awaited<ReturnType<typeof listChatMessages>> = [];
  let catalog: ChatCatalogItem[] = [];

  if (ready) {
    try {
      messages = await listChatMessages();
      if (!viewer || canContribute(viewer.role)) {
        catalog = await listChatCatalog();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Chat did not load.';
    }
  }

  const canSend = Boolean(!error && (!viewer || canContribute(viewer.role)));
  const notice = error ?? (viewer && !canContribute(viewer.role) ? APPROVAL_WAIT : null);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Chat">
          <ChatRoom
            initial={messages}
            canSend={canSend}
            notice={notice}
            catalog={catalog}
            viewerId={viewer?.id ?? null}
            moderator={viewer?.role === 'admin'}
          />
        </Window>
      </div>
    </PageWrapper>
  );
}
