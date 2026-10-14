import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function PostsLoading() {
  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Window title="Loading">
          <p className="font-mono text-sm uppercase tracking-wide text-gray-600">Loading posts...</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
