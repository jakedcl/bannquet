export function DashboardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2">
      {children}
    </div>
  );
}
