import { createHmac, timingSafeEqual } from 'crypto';

const MIN_MS = 3000;
const MAX_MS = 2 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const LIMIT = 5;

const hits = new Map<string, number[]>();

function stampSecret(): string {
  return process.env.NEON_AUTH_COOKIE_SECRET || 'bannquet-signup';
}

export function issueSignupStamp(now = Date.now()): string {
  const issued = String(now);
  const sig = createHmac('sha256', stampSecret()).update(issued).digest('base64url');
  return `${issued}.${sig}`;
}

export function readSignupStamp(stamp: string, now = Date.now()): 'ok' | 'fast' | 'stale' | 'bad' {
  const dot = stamp.indexOf('.');
  if (dot < 1) return 'bad';
  const issued = stamp.slice(0, dot);
  const sig = stamp.slice(dot + 1);
  const at = Number(issued);
  if (!/^\d+$/.test(issued) || !Number.isFinite(at)) return 'bad';
  const expected = createHmac('sha256', stampSecret()).update(issued).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return 'bad';
  const age = now - at;
  if (age < MIN_MS) return 'fast';
  if (age > MAX_MS) return 'stale';
  return 'ok';
}

/** Long, randomly mixed-case, and almost no vowels. Ordinary names stay clear. */
export function looksLikeGibberishName(name: string): boolean {
  const letters = name.replace(/[^A-Za-z]/g, '');
  if (letters.length < 12) return false;
  let switches = 0;
  for (let i = 1; i < letters.length; i += 1) {
    const prevUpper = letters[i - 1] === letters[i - 1].toUpperCase();
    const nextUpper = letters[i] === letters[i].toUpperCase();
    if (prevUpper !== nextUpper) switches += 1;
  }
  if (switches < 4) return false;
  const vowels = letters.match(/[aeiou]/gi)?.length ?? 0;
  return vowels / letters.length < 0.2;
}

export function gmailHasManyDots(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain !== 'gmail.com') return false;
  return (local.match(/\./g) ?? []).length >= 3;
}

export function dropGibberishGmail(displayName: string, email: string): boolean {
  return looksLikeGibberishName(displayName) && gmailHasManyDots(email);
}

export function signupLimited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < HOUR_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 2000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= HOUR_MS)) hits.delete(key);
    }
  }
  return false;
}

export function quietSignupBlock(formData: FormData, now = Date.now()): { done: true } | { error: string } | null {
  if (String(formData.get('website') ?? '').trim()) return { done: true };
  const stamp = readSignupStamp(String(formData.get('issued') ?? ''), now);
  if (stamp === 'bad') return { done: true };
  if (stamp === 'fast') return { error: 'Wait a moment, then try again.' };
  if (stamp === 'stale') return { error: 'Reload this page, then try again.' };
  return null;
}
