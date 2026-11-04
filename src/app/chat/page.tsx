import PageWrapper from '@/components/ui/PageWrapper';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { listChatCatalog, listChatMessages, type ChatCatalogItem } from '@/lib/chat';
import { APPROVAL_WAIT, canContribute, viewerCanContribute } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';

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
      if (viewerCanContribute(viewer)) {
        catalog = await listChatCatalog();
      }
    } catch (err) {
      error = loadFailed('chat', err, 'Chat did not load. Try again in a minute.');
    }
  }

  const canSend = Boolean(!error && viewerCanContribute(viewer));
  const notice = error ?? (!viewer ? 'Log in to chat.' : canContribute(viewer.role) ? null : APPROVAL_WAIT);

  return (
    <PageWrapper>
      <HubPage title="Chat" width="3xl">
        <Card>
          <ChatRoom
            key={error ? 'failed' : 'ready'}
            failed={Boolean(error && ready)}
            initial={messages}
            canSend={canSend}
            notice={notice}
            catalog={catalog}
            viewerId={viewer?.id ?? null}
            moderator={viewer?.role === 'admin'}
          />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
