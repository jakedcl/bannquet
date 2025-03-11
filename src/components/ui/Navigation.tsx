type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
];

export default function Navigation() {
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex flex-col ml-4 mt-4 w-60 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
        <div className="flex flex-col space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-item text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden">
        <div className="flex flex-col space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-item text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
} 