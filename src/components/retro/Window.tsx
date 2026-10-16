type WindowProps = {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: 'regular' | 'tight';
};

export function Window({ title, action, children, className = '', pad = 'regular' }: WindowProps) {
  return (
    <section className={`retro-box retro-window min-w-0 max-w-full rounded-none bg-white ${className}`}>
      {title ? (
        <header className="retro-banner flex items-center gap-2 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white">
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {action ? <span className="shrink-0">{action}</span> : null}
        </header>
      ) : null}
      <div className={pad === 'tight' ? 'min-w-0 p-2' : 'min-w-0 p-4'}>{children}</div>
    </section>
  );
}
