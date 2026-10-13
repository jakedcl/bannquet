export type InviteRecord = {
  email: string | null;
  expiresAt: Date;
  usedAt: Date | null;
};

export type InviteState = 'open' | 'used' | 'expired' | 'missing';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

export function adminEmailsFromEnv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => isEmail(entry));
}

export function isAdminEmail(email: string, admins: readonly string[]): boolean {
  return admins.includes(normalizeEmail(email));
}

export function inviteState(invite: InviteRecord | null, now = new Date()): InviteState {
  if (!invite) return 'missing';
  if (invite.usedAt) return 'used';
  if (invite.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'open';
}

export function signInAllowed(input: {
  email: string;
  adminEmails: readonly string[];
  member: boolean;
  openInvite: boolean;
}): boolean {
  if (!isEmail(input.email)) return false;
  if (input.member) return true;
  if (input.openInvite) return true;
  return isAdminEmail(input.email, input.adminEmails);
}

type AuthFailure = { message?: string; code?: string; status?: number } | null | undefined;

export function plainAuthError(error: AuthFailure): string {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();
  if (code === 'TOO_MANY_ATTEMPTS' || message.includes('too many')) {
    return 'Too many tries. Wait a few minutes, then ask for a new code.';
  }
  if (message.includes('otp') && message.includes('invalid')) {
    return 'That code did not match. Check the email and try again.';
  }
  if (message.includes('expired')) {
    return 'That code expired. Ask for a new one.';
  }
  return 'The sign-in email did not send. Try again in a minute, or ask Jake to text you the invite link.';
}

export function magicLinkError(error: AuthFailure): string {
  const message = (error?.message ?? '').toLowerCase();
  if (
    error?.status === 404 ||
    message.includes('not found') ||
    message.includes('magic') ||
    message.includes('not enabled') ||
    message.includes('plugin')
  ) {
    return 'Email links are not turned on yet. Use the code instead.';
  }
  return plainAuthError(error);
}

export function inviteCode(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
