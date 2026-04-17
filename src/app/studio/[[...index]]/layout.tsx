export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50" style={{ marginTop: 0 }}>
      {children}
    </div>
  );
}
