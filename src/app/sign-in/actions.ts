'use server';

import { put } from '@vercel/blob';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isActivity, type Activity } from '@/lib/activities';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import {
  createInvite,
  emailMaySignIn,
  ensureMember,
  findMemberByAuthId,
  findMemberByEmail,
  updateMemberProfile,
} from '@/lib/auth/members';
import { isEmail, magicLinkError, normalizeEmail, plainAuthError } from '@/lib/membership';
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

export async function requestSignInCode(email: string): Promise<{ error?: string; sent?: true }> {
  const normalized = normalizeEmail(email);
  if (!isEmail(normalized)) return { error: 'Enter a real email address.' };
  if (!isAuthConfigured()) return { error: 'Sign-in is not set up yet.' };
  if (!isDatabaseConfigured()) return { error: 'The member list is not connected yet.' };

  const allowed = await emailMaySignIn(normalized);
  if (!allowed) {
    return { error: 'That email is not on the invite list. Ask Jake for a link.' };
  }

  const { error } = await getAuth().emailOtp.sendVerificationOtp({
    email: normalized,
    type: 'sign-in',
  });
  if (error) return { error: plainAuthError(error) };
  return { sent: true };
}

export async function requestMagicLink(email: string): Promise<{ error?: string; sent?: true }> {
  const normalized = normalizeEmail(email);
  if (!isEmail(normalized)) return { error: 'Enter a real email address.' };
  if (!isAuthConfigured()) return { error: 'Sign-in is not set up yet.' };
  if (!isDatabaseConfigured()) return { error: 'The member list is not connected yet.' };

  const allowed = await emailMaySignIn(normalized);
  if (!allowed) {
    return { error: 'That email is not on the invite list. Ask Jake for a link.' };
  }

  const origin = await appOrigin();
  const { error } = await getAuth().signIn.magicLink({
    email: normalized,
    callbackURL: `${origin}/auth/continue`,
  });
  if (error) return { error: magicLinkError(error) };
  return { sent: true };
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
  const user = await currentAuthUser();
  if (!user) return { error: 'Sign in as Jake to send invites.' };
  const member = await findMemberByAuthId(user.id);
  if (!member || member.role !== 'admin') return { error: 'Only Jake can send invites.' };

  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (!isEmail(email)) return { error: 'Enter the email address your friend actually checks.' };

  const origin = await appOrigin();
  const already = await findMemberByEmail(email);
  if (already) {
    const link = await requestMagicLink(email);
    return {
      url: `${origin}/sign-in`,
      emailNote: link.sent
        ? `${email} already has an account. A fresh sign-in link is on the way.`
        : `${email} already has an account. The email link did not send, so point them at the sign-in page.`,
    };
  }

  const invite = await createInvite({ email, invitedBy: member.id });
  const url = `${origin}/invite/${invite.code}`;
  const link = await requestMagicLink(email);
  return {
    url,
    emailNote: link.sent
      ? 'A sign-in link is on the way. If it never shows up, text them the page link. They can ask for a code there.'
      : 'The email link did not send. Text them the page link. They can ask for a code there.',
  };
}
