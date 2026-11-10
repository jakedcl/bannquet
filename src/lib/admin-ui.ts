import type { MemberRole } from '@/lib/membership';

/** True when an admin is acting on someone else's content (use the hazard admin button). */
export function adminPowerActing(input: {
  role: MemberRole;
  actorId: string;
  ownerId: string | null | undefined;
}): boolean {
  if (input.role !== 'admin') return false;
  const owner = input.ownerId?.trim();
  if (!owner) return false;
  return owner !== input.actorId;
}

export function adminPowerLabel(base: string): { title: string; ariaLabel: string } {
  const title = `Admin: ${base}`;
  return { title, ariaLabel: title };
}
