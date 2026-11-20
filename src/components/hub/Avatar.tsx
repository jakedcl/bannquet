import Image from 'next/image';

/**
 * A round member avatar: their photo, or their initial on a green disc.
 * `size` is the box in px. Photos are not resized by Vercel.
 */
export function Avatar({ name, src, size = 36, className = '' }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.42)) }}
      aria-hidden="true"
    >
      {src ? <Image src={src} alt="" width={size * 2} height={size * 2} unoptimized className="h-full w-full object-cover" /> : initial}
    </span>
  );
}
