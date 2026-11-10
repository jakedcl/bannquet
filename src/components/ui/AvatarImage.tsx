import Image from 'next/image';

type AvatarImageProps = {
  src: string;
  alt?: string;
  width: number;
  height: number;
  className?: string;
};

export function AvatarImage({ src, alt = 'Profile photo', width, height, className }: AvatarImageProps) {
  return <Image src={src} alt={alt} width={width} height={height} unoptimized className={className} />;
}
