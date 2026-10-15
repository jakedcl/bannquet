const STACK = 'bannquet-nav-stack';
const BOOTED = 'bannquet-nav-booted';

function read(): string[] {
  try {
    const raw = sessionStorage.getItem(STACK);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string' && item.startsWith('/'));
  } catch {
    return [];
  }
}

function write(stack: string[]) {
  sessionStorage.setItem(STACK, JSON.stringify(stack.slice(-40)));
}

/** Record a document or client navigation. Path only, so query swaps do not fake a history entry. */
export function recordNav(pathname: string): void {
  if (typeof sessionStorage === 'undefined') return;
  const stack = read();
  const booted = sessionStorage.getItem(BOOTED) === '1';
  if (!booted) {
    sessionStorage.setItem(BOOTED, '1');
    if (stack.at(-1) === pathname) return;
    const found = stack.lastIndexOf(pathname);
    if (found >= 0) write(stack.slice(0, found + 1));
    else write([pathname]);
    return;
  }
  if (stack.at(-1) === pathname) return;
  const found = stack.lastIndexOf(pathname);
  if (found >= 0) write(stack.slice(0, found + 1));
  else write([...stack, pathname]);
}

export function canGoBackInApp(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return read().length > 1;
}

/** The next page is a static parent, not a browser-back step. */
export function noteFallback(href: string): void {
  if (typeof sessionStorage === 'undefined') return;
  write([href]);
}
