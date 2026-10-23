import { findMemberByHandle } from '@/lib/auth/members';
import { isEmail, normalizeEmail } from '@/lib/membership';
import { normalizeUsername } from '@/lib/handles';

export type ResolvedLogin =
  | { kind: 'email'; email: string; login: string }
  | { kind: 'handle'; email: string; login: string; handle: string }
  | { kind: 'unknown'; login: string };

export async function resolveLoginIdentifier(raw: string): Promise<ResolvedLogin> {
  const login = raw.trim();
  if (!login) return { kind: 'unknown', login: '' };

  if (isEmail(login)) {
    const email = normalizeEmail(login);
    return { kind: 'email', email, login: email };
  }

  const handle = normalizeUsername(login);
  if (!handle) return { kind: 'unknown', login };

  const member = await findMemberByHandle(handle);
  if (!member?.email) return { kind: 'unknown', login: handle };

  const email = normalizeEmail(member.email);
  return { kind: 'handle', email, login: handle, handle };
}
