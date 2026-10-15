import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/db';
import { listChatMessages } from '@/lib/chat';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ messages: [] }, { status: 503 });
  }
  const after = request.nextUrl.searchParams.get('after') ?? '';
  const afterId = request.nextUrl.searchParams.get('afterId') ?? '';
  const cursor = after && afterId && UUID.test(afterId) && !Number.isNaN(Date.parse(after))
    ? { after, afterId }
    : null;
  try {
    const messages = await listChatMessages(cursor);
    return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ messages: [], error: 'Chat did not refresh.' }, { status: 500 });
  }
}
