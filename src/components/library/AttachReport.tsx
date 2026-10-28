import Link from 'next/link';

export function SeeMore({ post }: { post: { id: string; title: string } | null }) {
  if (!post) return null;
  return (
    <p className="text-sm">
      See more at <Link href={`/posts/${post.id}`} className="underline">{post.title}</Link>
    </p>
  );
}
