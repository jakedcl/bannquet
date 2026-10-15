import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { handleRedirects, invites, users } from '@/db/schema';
import { isActivity, type Activity } from '@/lib/activities';
import {
  accountCreateAllowed,
  adminEmailsFromEnv,
  approvalAllowed,
  inviteCode,
  inviteState,
  isAdminEmail,
  normalizeEmail,
  publicSignUpAllowed,
  roleForNewAccount,
  signInAllowed,
  type MemberRole,
} from '@/lib/membership';
import {
  displayNameProblem,
  normalizeUsername,
  usernameAvailability,
  usernameChangeProblem,
} from '@/lib/handles';

export type Member = {
  id: string;
  email: string | null;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  homeRegion: string | null;
  bio: string | null;
  favoriteActivities: Activity[];
  role: MemberRole;
  homeScreenTipSeenAt: Date | null;
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
    homeScreenTipSeenAt: row.homeScreenTipSeenAt,
  };
}

export async function findMemberByAuthId(id: string): Promise<Member | null> {
  if (!isDatabaseConfigured()) return null;
  const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toMember(row) : null;
}

export async function findMemberByHandle(handle: string): Promise<Member | null> {
  if (!isDatabaseConfigured()) return null;
  const username = handle.trim().toLowerCase();
  if (!username) return null;
  const [row] = await getDb().select().from(users).where(eq(users.handle, username)).limit(1);
  return row ? toMember(row) : null;
}

export async function findHandleRedirect(handle: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const username = normalizeUsername(handle);
  if (!username) return null;
  const [row] = await getDb()
    .select({ current: users.handle })
    .from(handleRedirects)
    .innerJoin(users, eq(users.id, handleRedirects.userId))
    .where(eq(handleRedirects.handle, username))
    .limit(1);
  if (!row?.current || row.current === username) return null;
  return row.current;
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
  return signInAllowed({
    email: normalized,
    adminEmails: adminList(),
    member: Boolean(member),
  });
}

export async function emailMaySignUpPublicly(email: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const member = await findMemberByEmail(email);
  return publicSignUpAllowed({ email, member: Boolean(member) });
}

export async function emailMayCreateAccount(email: string, code: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const normalized = normalizeEmail(email);
  const member = await findMemberByEmail(normalized);
  const invite = code ? await getInviteByCode(code) : null;
  const openInvite = Boolean(
    invite &&
      invite.email &&
      normalizeEmail(invite.email) === normalized &&
      inviteState({
        email: invite.email,
        expiresAt: invite.expiresAt,
        usedAt: invite.usedAt,
      }) === 'open',
  );
  return accountCreateAllowed({
    email: normalized,
    adminEmails: adminList(),
    member: Boolean(member),
    openInvite,
  });
}

export async function ensureMember(
  authUser: AuthUser,
  options: { publicSignUp?: boolean } = {},
): Promise<{ member: Member; created: boolean } | null> {
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
  const role = roleForNewAccount({
    email,
    adminEmails: adminList(),
    openInvite: Boolean(openInvite),
    publicSignUp: Boolean(options.publicSignUp),
  });
  if (!role) return null;

  const displayName = authUser.name?.trim() || null;
  const [created] = await db
    .insert(users)
    .values({
      id: authUser.id,
      email,
      handle: null,
      displayName,
      avatarUrl: authUser.image ?? null,
      role,
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

export async function countPendingMembers(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, 'pending'));
  return row?.n ?? 0;
}

export async function approvePendingMember(id: string, actorRole: MemberRole): Promise<{ error?: string }> {
  const [target] = await getDb().select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target || !approvalAllowed({ actorRole, targetRole: target.role })) {
    return { error: 'That person is not waiting anymore.' };
  }
  await getDb().update(users).set({ role: 'member' }).where(and(eq(users.id, id), eq(users.role, 'pending')));
  return {};
}

export async function denyPendingMember(id: string, actorRole: MemberRole): Promise<{ error?: string }> {
  const db = getDb();
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target || !approvalAllowed({ actorRole, targetRole: target.role })) {
    return { error: 'That person is not waiting anymore.' };
  }
  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(users)
      .where(and(eq(users.id, id), eq(users.role, 'pending')))
      .returning({ id: users.id });
    if (removed.length === 0) return;
    await tx.execute(sql`delete from neon_auth."user" where id = ${id}`);
  });
  return {};
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
  const nameProblem = displayNameProblem(input.displayName);
  if (nameProblem) return { error: nameProblem };
  const db = getDb();

  return db.transaction(async (tx) => {
    const [current] = await tx.select({ handle: users.handle }).from(users).where(eq(users.id, id)).limit(1);
    const change = usernameChangeProblem(current?.handle ?? null, input.handle);
    if (change) return { error: change };
    const username = current?.handle ? normalizeUsername(current.handle) : normalizeUsername(input.handle);
    const [taken] = await tx.select({ id: users.id }).from(users).where(eq(users.handle, username)).limit(1);
    const [reserved] = await tx
      .select({ userId: handleRedirects.userId })
      .from(handleRedirects)
      .where(eq(handleRedirects.handle, username))
      .limit(1);
    const reservedBySomeoneElse = reserved && reserved.userId !== id ? reserved.userId : null;
    const problem = usernameAvailability({
      username,
      takenById: taken?.id ?? reservedBySomeoneElse,
      selfId: id,
    });
    if (problem) return { error: problem };

    if (reserved?.userId === id) {
      await tx.delete(handleRedirects).where(eq(handleRedirects.handle, username));
    }

    const [updated] = await tx
      .update(users)
      .set({
        displayName: input.displayName.trim(),
        handle: username,
        bio: input.bio || null,
        homeRegion: input.homeRegion || null,
        favoriteActivities: input.favoriteActivities,
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      })
      .where(eq(users.id, id))
      .returning();
    if (!updated) return { error: 'Could not save that profile.' };

    const previous = current?.handle;
    if (previous && previous !== username) {
      await tx
        .insert(handleRedirects)
        .values({ handle: previous, userId: id })
        .onConflictDoUpdate({
          target: handleRedirects.handle,
          set: { userId: id },
        });
    }

    return { member: toMember(updated) };
  });
}
