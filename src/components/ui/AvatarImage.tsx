import Image from 'next/image';

type AvatarImageProps = {
  src: string;
  width: number;
  height: number;
  className?: string;
};

export function AvatarImage({ src, width, height, className }: AvatarImageProps) {
  return <Image src={src} alt="" width={width} height={height} unoptimized className={className} />;
}
