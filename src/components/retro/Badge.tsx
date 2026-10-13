type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`retro-box-inset inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-gray-800 ${className}`}>
      {children}
    </span>
  );
}
