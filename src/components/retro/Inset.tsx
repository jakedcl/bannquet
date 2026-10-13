type InsetProps = {
  children: React.ReactNode;
  className?: string;
};

export function Inset({ children, className = '' }: InsetProps) {
  return <div className={`retro-box-inset bg-white p-2 ${className}`}>{children}</div>;
}
