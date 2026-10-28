import Link from 'next/link';
import { Window } from '@/components/retro/Window';

export default function NotFound() {
  return (
    <div className="page-frame mt-[72px] min-h-[calc(100vh-72px)]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Not found">
          <p className="text-sm font-bold">That page is not here.</p>
          <p className="mt-3 text-sm">
            <Link href="/" className="font-bold underline">Home</Link>
          </p>
        </Window>
      </div>
    </div>
  );
}
