export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Failed sign-ins allowed for one account from one network in the window. */
export const ACCOUNT_FAILURES = 8;
/** All failed sign-ins from one network. High so a shared hut or office wifi isn't locked out. */
export const NETWORK_FAILURES = 40;
/** Reset emails for one address, and from one network, in the window. */
export const RESET_PER_EMAIL = 3;
export const RESET_PER_NETWORK = 10;

export type Bucket = { key: string; max: number };

/**
 * Lockout is per account AND network, so someone who knows a username can't
 * lock that member out from elsewhere, and one person's typos on shared wifi
 * don't lock out everyone else there.
 */
export function signInBuckets(input: { ip: string; email?: string; login?: string }): Bucket[] {
  const account = (input.email ?? input.login ?? '').trim().toLowerCase();
  const buckets: Bucket[] = [{ key: `ip:${input.ip}`, max: NETWORK_FAILURES }];
  if (account) buckets.push({ key: `acct:${account}|ip:${input.ip}`, max: ACCOUNT_FAILURES });
  return buckets;
}

export function resetBuckets(input: { ip: string; email: string }): Bucket[] {
  return [
    { key: `reset:${input.email.trim().toLowerCase()}`, max: RESET_PER_EMAIL },
    { key: `reset-ip:${input.ip}`, max: RESET_PER_NETWORK },
  ];
}
