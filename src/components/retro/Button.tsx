import Link from 'next/link';

export const BUTTON_TONES = ['default', 'primary', 'yellow', 'orange', 'pink', 'blue', 'green', 'purple'] as const;

export type ButtonTone = (typeof BUTTON_TONES)[number];

export const BUTTON_TONE_CLASS: Record<ButtonTone, string> = {
  default: 'retro-button text-gray-800',
  primary: 'retro-button retro-button-primary',
  yellow: 'retro-button retro-button-yellow',
  orange: 'retro-button retro-button-orange',
  pink: 'retro-button retro-button-pink',
  blue: 'retro-button retro-button-blue',
  green: 'retro-button retro-button-green',
  purple: 'retro-button retro-button-purple',
};

type ButtonProps = {
  tone?: ButtonTone;
  href?: string;
  type?: 'button' | 'submit';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

export function Button({ tone = 'default', href, type = 'button', className = '', children, onClick }: ButtonProps) {
  const classes = `${BUTTON_TONE_CLASS[tone]} rounded-none px-4 py-2 text-sm font-bold uppercase tracking-wide ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
