import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { passwordResetLinks } from '@/db/schema';

export type StoredResetLink = {
  id: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export async function savePasswordResetLink(input: {
  token: string;
  tokenHash: string;
  userId: string;
  createdBy: string;
  expiresAt: Date;
}): Promise<void> {
  const db = getDb();
  const verificationId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(passwordResetLinks).values({
      tokenHash: input.tokenHash,
      userId: input.userId,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt,
      emailed: false,
    });
    await tx.execute(sql`
      insert into neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
      values (
        ${verificationId}::uuid,
        ${`reset-password:${input.token}`},
        ${input.userId},
        ${input.expiresAt.toISOString()}::timestamptz,
        now(),
        now()
      )
    `);
  });
}

export async function markPasswordResetEmailed(tokenHash: string): Promise<void> {
  await getDb()
    .update(passwordResetLinks)
    .set({ emailed: true })
    .where(eq(passwordResetLinks.tokenHash, tokenHash));
}

export async function findPasswordResetLink(tokenHash: string): Promise<StoredResetLink | null> {
  const [row] = await getDb()
    .select({
      id: passwordResetLinks.id,
      expiresAt: passwordResetLinks.expiresAt,
      usedAt: passwordResetLinks.usedAt,
    })
    .from(passwordResetLinks)
    .where(eq(passwordResetLinks.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

export async function markPasswordResetLinkUsed(id: string): Promise<void> {
  await getDb()
    .update(passwordResetLinks)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetLinks.id, id));
}
