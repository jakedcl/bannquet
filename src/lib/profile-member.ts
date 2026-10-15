import { notFound, redirect } from 'next/navigation';
import { findHandleRedirect, findMemberByHandle } from '@/lib/auth/members';

export async function profileMember(username: string, section?: string) {
  const member = await findMemberByHandle(username);
  if (!member) {
    const nextHandle = await findHandleRedirect(username);
    if (nextHandle) redirect(section ? `/user/${nextHandle}/${section}` : `/user/${nextHandle}`);
    notFound();
  }
  return member;
}
