import { headers } from 'next/headers';
import { dropGibberishGmail, signupLimited } from '@/lib/signup-guard';

async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headerList.get('x-real-ip') || 'unknown';
}

export async function signupCrowdBlock(email: string, displayName: string): Promise<{ done: true } | { error: string } | null> {
  if (signupLimited(await clientIp())) {
    return { error: 'Too many new accounts from this network. Try again in an hour.' };
  }
  if (dropGibberishGmail(displayName, email)) return { done: true };
  return null;
}
