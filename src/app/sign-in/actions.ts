'use server';

import { put } from '@vercel/blob';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isActivity, type Activity } from '@/lib/activities';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import {
  createInvite,
  emailMayCreateAccount,
  emailMaySignIn,
  ensureMember,
  findMemberByAuthId,
  findMemberByEmail,
  updateMemberProfile,
} from '@/lib/auth/members';
import {
  findPasswordResetLink,
  markPasswordResetEmailed,
  markPasswordResetLinkUsed,
  savePasswordResetLink,
} from '@/lib/auth/resets';
import { isEmail, normalizeEmail } from '@/lib/membership';
import {
  hashResetToken,
  newResetToken,
  passwordAuthError,
  passwordProblem,
  passwordResetAudit,
  resetLinkExpiry,
  resetLinkState,
} from '@/lib/passwords';
import { isDatabaseConfigured } from '@/db';
import { REGION_OPTIONS } from '@/lib/regions';

async function appOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

async function currentAuthUser() {
  if (!isAuthConfigured()) return null;
  const { data } = await getAuth().getSession();
  const user = data?.user;
  if (!user?.id || !user.email) return null;
  return user;
}

export async function getViewer() {
  const user = await currentAuthUser();
  if (!user) return null;
  return findMemberByAuthId(user.id);
}

const SIGN_IN_MISMATCH = "That email and password didn't match.";
const RESET_LINK_BAD = 'That reset link is used or expired. Ask Jake for a new one.';

async function requireAdmin() {
  const user = await currentAuthUser();
  if (!user) return { error: 'Sign in as Jake to do that.', member: null };
  const member = await findMemberByAuthId(user.id);
  if (!member || member.role !== 'admin') return { error: 'Only Jake can do that.', member: null };
  return { error: null, member };
}

export async function signInWithPassword(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  if (!isEmail(email)) return { error: 'Enter a real email address.' };
  if (!password) return { error: 'Type your password.' };
  if (!isAuthConfigured()) return { error: 'Sign-in is not set up yet.' };
  if (!isDatabaseConfigured()) return { error: 'The member list is not connected yet.' };

  const allowed = await emailMaySignIn(email);
  if (!allowed) return { error: 'That email is not on the invite list. Ask Jake for a link.' };

  const { error } = await getAuth().signIn.email({ email, password, rememberMe: true });
  if (error) return { error: passwordAuthError(error, SIGN_IN_MISMATCH) };
  redirect('/auth/continue');
}

export async function createAccount(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const inviteCode = String(formData.get('inviteCode') ?? '').trim();
  if (!isEmail(email)) return { error: 'Enter a real email address.' };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: 'Type the same password in both boxes.' };
  if (!isAuthConfigured()) return { error: 'Sign-in is not set up yet.' };
  if (!isDatabaseConfigured()) return { error: 'The member list is not connected yet.' };

  const allowed = await emailMayCreateAccount(email, inviteCode);
  if (!allowed) return { error: 'That invite is not open. Ask Jake for a new link.' };

  const name = email.split('@')[0] || 'Friend';
  const { error } = await getAuth().signUp.email({ email, password, name });
  if (error) return { error: passwordAuthError(error, 'Could not make that account. Try again in a minute.') };

  // The new session cookie is on this response. The next request reads it and
  // finishes the member row. Reading the session in this same action misses it.
  redirect('/auth/continue');
}

export async function requestPasswordResetEmail(
  _prev: { error?: string; sent?: true } | null,
  formData: FormData,
): Promise<{ error?: string; sent?: true }> {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (!isEmail(email)) return { error: 'Enter a real email address.' };
  if (!isAuthConfigured() || !isDatabaseConfigured()) {
    return { error: 'Password reset is not set up yet.' };
  }

  const allowed = await emailMaySignIn(email);
  if (allowed) {
    const origin = await appOrigin();
    const { error } = await getAuth().requestPasswordReset({
      email,
      redirectTo: `${origin}/reset-password`,
    });
    if (error) return { error: passwordAuthError(error, 'The reset email did not send. Try again in a minute.') };
  }
  return { sent: true };
}

export async function completePasswordReset(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const token = String(formData.get('token') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (!token) return { error: 'That reset link is missing. Ask Jake for a new one.' };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: 'Type the same password in both boxes.' };
  if (!isAuthConfigured() || !isDatabaseConfigured()) return { error: 'Password reset is not set up yet.' };

  const tokenHash = hashResetToken(token);
  const link = await findPasswordResetLink(tokenHash);
  if (link && resetLinkState(link) !== 'open') return { error: RESET_LINK_BAD };

  const { error } = await getAuth().resetPassword({ newPassword: password, token });
  if (error) return { error: passwordAuthError(error, RESET_LINK_BAD) };
  if (link) await markPasswordResetLinkUsed(link.id);
  redirect('/sign-in?reset=1');
}

export async function finishSignIn(): Promise<void> {
  if (!isAuthConfigured() || !isDatabaseConfigured()) {
    redirect('/sign-in?error=setup');
  }
  const user = await currentAuthUser();
  if (!user?.email) redirect('/sign-in');

  const result = await ensureMember({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  });
  if (!result) {
    await getAuth().signOut();
    redirect('/sign-in?error=invite');
  }
  if (result.created || !result.member.handle) {
    redirect('/settings?welcome=1');
  }
  redirect(`/hikers/${result.member.handle}`);
}

export async function signOutAction(): Promise<void> {
  if (isAuthConfigured()) {
    await getAuth().signOut();
  }
  redirect('/');
}

export async function saveProfile(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const user = await currentAuthUser();
  if (!user) return { error: 'Sign in again to save your profile.' };
  const member = await findMemberByAuthId(user.id);
  if (!member) return { error: 'Sign in again to save your profile.' };

  const displayName = String(formData.get('displayName') ?? '').trim();
  const handle = String(formData.get('handle') ?? '').trim().toLowerCase();
  const bio = String(formData.get('bio') ?? '').trim().slice(0, 500);
  const homeRegion = String(formData.get('homeRegion') ?? '').trim();
  const favoriteActivities = formData
    .getAll('favoriteActivities')
    .filter((value): value is string => typeof value === 'string')
    .filter(isActivity);

  if (displayName.length < 1 || displayName.length > 80) {
    return { error: 'Add a name people will recognize. Keep it under 80 characters.' };
  }
  if (homeRegion && !REGION_OPTIONS.some((option) => option.code === homeRegion)) {
    return { error: 'Pick a home region from the list.' };
  }

  let avatarUrl: string | undefined;
  const avatar = formData.get('avatar');
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith('image/')) {
      return { error: 'Use a photo file, like a JPG or PNG.' };
    }
    if (avatar.size > 2 * 1024 * 1024) {
      return { error: 'That photo is over 2 MB. Pick a smaller one.' };
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { error: 'Photo upload is not set up yet. You can still save the rest of your profile.' };
    }
    const blob = await put(`avatars/${member.id}-${Date.now()}-${avatar.name}`, avatar, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    avatarUrl = blob.url;
  }

  const saved = await updateMemberProfile(member.id, {
    displayName,
    handle,
    bio,
    homeRegion,
    favoriteActivities: favoriteActivities as Activity[],
    avatarUrl,
  });
  if (saved.error || !saved.member) return { error: saved.error ?? 'Could not save that profile.' };
  redirect(`/hikers/${saved.member.handle}`);
}

export async function inviteFriend(
  _prev: { error?: string; url?: string; emailNote?: string } | null,
  formData: FormData,
): Promise<{ error?: string; url?: string; emailNote?: string }> {
  const admin = await requireAdmin();
  if (!admin.member) return { error: admin.error ?? 'Only Jake can send invites.' };

  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (!isEmail(email)) return { error: 'Enter the email address your friend actually checks.' };

  const origin = await appOrigin();
  const already = await findMemberByEmail(email);
  if (already) {
    return {
      url: `${origin}/sign-in`,
      emailNote: `${email} already has an account. Point them at the sign-in page. Forgot password is there too.`,
    };
  }

  const invite = await createInvite({ email, invitedBy: admin.member.id });
  return {
    url: `${origin}/invite/${invite.code}`,
    emailNote: 'Text them this page. They will choose a password there.',
  };
}

export async function createMemberResetLink(
  _prev: { error?: string; url?: string; emailNote?: string } | null,
  formData: FormData,
): Promise<{ error?: string; url?: string; emailNote?: string }> {
  const admin = await requireAdmin();
  if (!admin.member) return { error: admin.error ?? 'Only Jake can reset a password.' };

  const userId = String(formData.get('userId') ?? '').trim();
  const sendEmail = formData.get('emailToo') === 'yes';
  const member = await findMemberByAuthId(userId);
  if (!member?.email) return { error: 'That person does not have an email on their account.' };

  const token = newResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = resetLinkExpiry();
  const audit = passwordResetAudit({
    actorId: admin.member.id,
    targetUserId: member.id,
    emailed: false,
    token,
  });
  if (audit.tokenHash !== tokenHash) return { error: 'Could not make a reset link. Try again.' };

  try {
    await savePasswordResetLink({
      token,
      tokenHash,
      userId: member.id,
      createdBy: admin.member.id,
      expiresAt,
    });
  } catch (error) {
    console.error('password reset link failed', {
      actorId: audit.actorId,
      targetUserId: audit.targetUserId,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { error: 'Could not make a reset link. Try again in a minute.' };
  }

  console.info('password reset link created', {
    actorId: audit.actorId,
    targetUserId: audit.targetUserId,
    emailed: sendEmail,
  });

  const origin = await appOrigin();
  const url = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  if (!sendEmail) {
    return { url, emailNote: 'Text them this link. It works once and lasts 24 hours.' };
  }

  const { error } = await getAuth().requestPasswordReset({
    email: member.email,
    redirectTo: `${origin}/reset-password`,
  });
  if (error) {
    return {
      url,
      emailNote: 'The email did not send. Text them the link instead. It works once and lasts 24 hours.',
    };
  }
  await markPasswordResetEmailed(tokenHash);
  return {
    url,
    emailNote: 'A reset email is on the way too. The link below is the one to text. It works once and lasts 24 hours.',
  };
}
