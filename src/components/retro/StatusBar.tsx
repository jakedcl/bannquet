type StatusBarProps = {
  children: React.ReactNode;
};

export function StatusBar({ children }: StatusBarProps) {
  return (
    <footer className="retro-box-inset bg-beige px-3 py-1 text-xs uppercase tracking-wide text-foreground">
      {children}
    </footer>
  );
}
