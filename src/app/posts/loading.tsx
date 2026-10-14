import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function PostsLoading() {
  return (
    <PageWrapper>
      <div className="page-shell page-pad">
        <Window title="Loading">
          <p className="text-sm uppercase tracking-wide text-ink-soft">Loading posts...</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
