import { createHash, randomBytes } from 'node:crypto';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const RESET_LINK_TTL_MS = 24 * 60 * 60 * 1000;

export function passwordProblem(password: string): string | null {
  if (password.length < 1) return 'Type a password.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Keep the password under ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function newResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type ResetLinkRecord = {
  expiresAt: Date;
  usedAt: Date | null;
};

export type ResetLinkState = 'open' | 'used' | 'expired' | 'missing';

export function resetLinkState(link: ResetLinkRecord | null, now = new Date()): ResetLinkState {
  if (!link) return 'missing';
  if (link.usedAt) return 'used';
  if (link.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'open';
}

export function resetLinkExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RESET_LINK_TTL_MS);
}

export type PasswordResetAudit = {
  actorId: string;
  targetUserId: string;
  emailed: boolean;
  tokenHash: string;
};

export function passwordResetAudit(input: {
  actorId: string;
  targetUserId: string;
  emailed: boolean;
  token: string;
}): PasswordResetAudit {
  return {
    actorId: input.actorId,
    targetUserId: input.targetUserId,
    emailed: input.emailed,
    tokenHash: hashResetToken(input.token),
  };
}

type AuthFailure = { message?: string; code?: string } | null | undefined;

export function passwordAuthError(error: AuthFailure, fallback: string): string {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();
  if (code === 'TOO_MANY_ATTEMPTS' || message.includes('too many')) {
    return 'Too many tries. Wait a few minutes, then try again.';
  }
  if (code === 'PASSWORD_TOO_SHORT' || message.includes('too short')) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (code === 'PASSWORD_TOO_LONG' || message.includes('too long')) {
    return `Keep the password under ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (code === 'USER_ALREADY_EXISTS' || message.includes('already')) {
    return 'That email already has an account. Sign in, or use forgot password.';
  }
  if (code === 'INVALID_TOKEN' || message.includes('invalid token') || message.includes('expired')) {
    return 'That reset link is used or expired. Ask Jake for a new one.';
  }
  return fallback;
}
