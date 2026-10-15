import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function ChatLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Chat">
          <p className="text-sm">Loading chat.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
