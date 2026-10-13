import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { invites, users } from '@/db/schema';
import { isActivity, type Activity } from '@/lib/activities';
import { adminEmailsFromEnv, inviteCode, isAdminEmail, normalizeEmail, signInAllowed } from '@/lib/membership';
import { handleFromName, isHandle, nextHandleCandidate } from '@/lib/handles';

export type Member = {
  id: string;
  email: string | null;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  homeRegion: string | null;
  bio: string | null;
  favoriteActivities: Activity[];
  role: 'member' | 'admin';
};

export type InviteRow = {
  id: string;
  code: string;
  email: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

function adminList(): string[] {
  return adminEmailsFromEnv(process.env.ADMIN_EMAIL);
}

function asActivities(values: string[] | null | undefined): Activity[] {
  return (values ?? []).filter(isActivity);
}

function toMember(row: typeof users.$inferSelect): Member {
  return {
    id: row.id,
    email: row.email,
    handle: row.handle,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    homeRegion: row.homeRegion,
    bio: row.bio,
    favoriteActivities: asActivities(row.favoriteActivities),
    role: row.role,
  };
}

export async function findMemberByAuthId(id: string): Promise<Member | null> {
  if (!isDatabaseConfigured()) return null;
  const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toMember(row) : null;
}

export async function findMemberByHandle(handle: string): Promise<Member | null> {
  if (!isDatabaseConfigured()) return null;
  const [row] = await getDb().select().from(users).where(eq(users.handle, handle)).limit(1);
  return row ? toMember(row) : null;
}

export async function findMemberByEmail(email: string): Promise<Member | null> {
  const [row] = await getDb().select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return row ? toMember(row) : null;
}

async function findOpenInvite(email: string) {
  const now = new Date();
  const [row] = await getDb()
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.email, normalizeEmail(email)),
        isNull(invites.usedAt),
        gt(invites.expiresAt, now),
      ),
    )
    .orderBy(desc(invites.createdAt))
    .limit(1);
  return row ?? null;
}

export async function emailMaySignIn(email: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const normalized = normalizeEmail(email);
  const member = await findMemberByEmail(normalized);
  const invite = member ? null : await findOpenInvite(normalized);
  return signInAllowed({
    email: normalized,
    adminEmails: adminList(),
    member: Boolean(member),
    openInvite: Boolean(invite),
  });
}

async function unusedHandle(base: string, exceptId?: string): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = nextHandleCandidate(base, attempt);
    const [found] = await db.select({ id: users.id }).from(users).where(eq(users.handle, candidate)).limit(1);
    if (!found || found.id === exceptId) return candidate;
  }
  return nextHandleCandidate(base, 40);
}

export async function ensureMember(authUser: AuthUser): Promise<{ member: Member; created: boolean } | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const email = normalizeEmail(authUser.email);
  const existing = await findMemberByAuthId(authUser.id);
  if (existing) {
    if (existing.email !== email || (isAdminEmail(email, adminList()) && existing.role !== 'admin')) {
      const [updated] = await db
        .update(users)
        .set({
          email,
          role: isAdminEmail(email, adminList()) ? 'admin' : existing.role,
        })
        .where(eq(users.id, authUser.id))
        .returning();
      return { member: toMember(updated), created: false };
    }
    return { member: existing, created: false };
  }

  const byEmail = await findMemberByEmail(email);
  if (byEmail && byEmail.id !== authUser.id) {
    return { member: byEmail, created: false };
  }

  const openInvite = await findOpenInvite(email);
  const admin = isAdminEmail(email, adminList());
  if (!openInvite && !admin) return null;

  const displayName = authUser.name?.trim() || email.split('@')[0] || 'Friend';
  const handle = await unusedHandle(handleFromName(displayName));
  const [created] = await db
    .insert(users)
    .values({
      id: authUser.id,
      email,
      handle,
      displayName,
      avatarUrl: authUser.image ?? null,
      role: admin ? 'admin' : 'member',
      favoriteActivities: [],
    })
    .returning();

  if (openInvite) {
    await db
      .update(invites)
      .set({ usedBy: created.id, usedAt: new Date() })
      .where(eq(invites.id, openInvite.id));
  }

  return { member: toMember(created), created: true };
}

export async function listMembers(): Promise<Member[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDb().select().from(users).orderBy(desc(users.createdAt));
  return rows.map(toMember);
}

export async function listInvites(): Promise<InviteRow[]> {
  if (!isDatabaseConfigured()) return [];
  return getDb()
    .select({
      id: invites.id,
      code: invites.code,
      email: invites.email,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
      createdAt: invites.createdAt,
    })
    .from(invites)
    .orderBy(desc(invites.createdAt));
}

export async function getInviteByCode(code: string) {
  if (!isDatabaseConfigured()) return null;
  const [row] = await getDb().select().from(invites).where(eq(invites.code, code)).limit(1);
  return row ?? null;
}

export async function createInvite(input: { email: string; invitedBy: string }): Promise<InviteRow> {
  const email = normalizeEmail(input.email);
  const existing = await findOpenInvite(email);
  if (existing) {
    return {
      id: existing.id,
      code: existing.code,
      email: existing.email,
      expiresAt: existing.expiresAt,
      usedAt: existing.usedAt,
      createdAt: existing.createdAt,
    };
  }

  const [row] = await getDb()
    .insert(invites)
    .values({
      code: inviteCode(),
      email,
      invitedBy: input.invitedBy,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    .returning({
      id: invites.id,
      code: invites.code,
      email: invites.email,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
      createdAt: invites.createdAt,
    });
  return row;
}

export async function updateMemberProfile(
  id: string,
  input: {
    displayName: string;
    handle: string;
    bio: string;
    homeRegion: string;
    favoriteActivities: Activity[];
    avatarUrl?: string | null;
  },
): Promise<{ member?: Member; error?: string }> {
  if (!isHandle(input.handle)) {
    return { error: 'Pick a handle with 3 to 24 letters, numbers, or hyphens.' };
  }
  const db = getDb();
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, input.handle)).limit(1);
  if (taken && taken.id !== id) {
    return { error: 'That handle is already taken.' };
  }

  const [updated] = await db
    .update(users)
    .set({
      displayName: input.displayName,
      handle: input.handle,
      bio: input.bio || null,
      homeRegion: input.homeRegion || null,
      favoriteActivities: input.favoriteActivities,
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    })
    .where(eq(users.id, id))
    .returning();

  return { member: toMember(updated) };
}
