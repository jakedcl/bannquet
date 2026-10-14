const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export const USERNAME_RULE =
  'Usernames use lowercase letters, numbers, and underscores, 3 to 24 characters.';

export const USERNAME_TAKEN = 'That username is already taken. Pick another.';

export const DISPLAY_NAME_RULE = 'Add the name your friends know you by.';

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function usernameProblem(value: string): string | null {
  const username = normalizeUsername(value);
  if (!username) return 'Pick a username. It is the address of your page.';
  if (!isUsername(username)) return USERNAME_RULE;
  return null;
}

export function displayNameProblem(value: string): string | null {
  const name = value.trim();
  if (!name) return DISPLAY_NAME_RULE;
  if (name.length > 80) return 'That name is too long. Keep it under 80 characters.';
  return null;
}

export function usernameAvailability(input: {
  username: string;
  takenById: string | null;
  selfId?: string;
}): string | null {
  const problem = usernameProblem(input.username);
  if (problem) return problem;
  if (input.takenById && input.takenById !== input.selfId) return USERNAME_TAKEN;
  return null;
}

export function profileNeedsNames(member: {
  handle: string | null;
  displayName: string | null;
}): boolean {
  return !member.handle?.trim() || !member.displayName?.trim();
}

export function nextStopForMember(member: {
  handle: string | null;
  displayName: string | null;
}): string {
  if (profileNeedsNames(member) || !member.handle) return '/settings?welcome=1';
  return `/user/${member.handle}`;
}

export type ProfileClaim = { displayName: string; username: string };

export function encodeProfileClaim(displayName: string, username: string): string {
  return JSON.stringify({
    displayName: displayName.trim(),
    username: normalizeUsername(username),
  });
}

export function decodeProfileClaim(raw: string | undefined | null): ProfileClaim | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { displayName?: unknown; username?: unknown };
    if (typeof parsed.displayName !== 'string' || typeof parsed.username !== 'string') return null;
    if (displayNameProblem(parsed.displayName) || usernameProblem(parsed.username)) return null;
    return {
      displayName: parsed.displayName.trim(),
      username: normalizeUsername(parsed.username),
    };
  } catch {
    return null;
  }
}
