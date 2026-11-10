import { getViewer } from '@/app/sign-in/actions';
import type { findMemberByAuthId } from '@/lib/auth/members';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';

export type MemberView = NonNullable<Awaited<ReturnType<typeof findMemberByAuthId>>>;

export type ContributorResult =
  | { ok: true; viewer: MemberView }
  | { ok: false; error: string; viewer: null };

/** Signed-in member or admin who may post. Redirects when there is no session. */
export async function requireContributor(): Promise<ContributorResult | never> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) {
    return { ok: false, error: APPROVAL_WAIT, viewer: null };
  }
  return { ok: true, viewer };
}
