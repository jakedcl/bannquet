import { headers } from 'next/headers';

export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headerList.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}
