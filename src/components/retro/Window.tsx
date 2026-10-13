type WindowProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Window({ title, children, className = '' }: WindowProps) {
  return (
    <section className={`retro-box retro-window rounded-none bg-white ${className}`}>
      {title ? (
        <header className="retro-banner px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white">
          {title}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
