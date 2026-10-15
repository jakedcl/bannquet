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
}): boolean {
  if (!isEmail(input.email)) return false;
  if (input.member) return true;
  return isAdminEmail(input.email, input.adminEmails);
}

export function accountCreateAllowed(input: {
  email: string;
  adminEmails: readonly string[];
  member: boolean;
  openInvite: boolean;
}): boolean {
  if (!isEmail(input.email)) return false;
  if (input.member) return false;
  if (input.openInvite) return true;
  return isAdminEmail(input.email, input.adminEmails);
}

export type MemberRole = 'pending' | 'member' | 'admin';

export const APPROVAL_WAIT = 'Waiting for Jake to approve you';

export function publicSignUpAllowed(input: { email: string; member: boolean }): boolean {
  if (!isEmail(input.email)) return false;
  return !input.member;
}

export function roleForNewAccount(input: {
  email: string;
  adminEmails: readonly string[];
  openInvite: boolean;
  publicSignUp: boolean;
}): MemberRole | null {
  if (isAdminEmail(input.email, input.adminEmails)) return 'admin';
  if (input.openInvite) return 'member';
  if (input.publicSignUp) return 'pending';
  return null;
}

export function canContribute(role: MemberRole): boolean {
  return role === 'member' || role === 'admin';
}

export function canDeleteOwned(input: { actorRole: MemberRole; actorId: string; ownerId: string | null }): boolean {
  if (!canContribute(input.actorRole)) return false;
  if (input.actorRole === 'admin') return true;
  return input.ownerId != null && input.ownerId === input.actorId;
}

export function approvalAllowed(input: { actorRole: MemberRole; targetRole: MemberRole }): boolean {
  return input.actorRole === 'admin' && input.targetRole === 'pending';
}

export function inviteCode(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
