import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { isPublishedSanityId } from './map';

export { SIGNATURE_HEADER_NAME };

export const IDEMPOTENCY_HEADER_NAME = 'idempotency-key';

export type SanityWebhookPayload = {
  _id: string;
  _type: string;
  _rev?: string;
  op?: string;
};

const SYNC_TYPES = new Set(['photo', 'track']);

export function shouldIgnoreSanityWebhookPayload(payload: SanityWebhookPayload): boolean {
  if (!payload._id || !isPublishedSanityId(payload._id)) return true;
  if (!SYNC_TYPES.has(payload._type)) return true;
  return false;
}

export type SanityWebhookHandlerDeps = {
  syncOne: (sanityId: string) => Promise<unknown>;
  claimIdempotency: (key: string) => Promise<boolean>;
  postSyncSideEffects: (sanityId: string) => Promise<void>;
};

export async function handleSanityWebhook(
  input: {
    rawBody: string;
    signature: string | null | undefined;
    idempotencyKey: string | null | undefined;
    secret: string | undefined;
  },
  deps: SanityWebhookHandlerDeps,
): Promise<Response> {
  const secret = input.secret?.trim();
  if (!secret) {
    console.error('[sanity-webhook] SANITY_WEBHOOK_SECRET is not configured');
    return Response.json({ error: 'Misconfigured' }, { status: 500 });
  }

  const signature = input.signature?.trim();
  if (!signature || !(await isValidSignature(input.rawBody, signature, secret))) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: SanityWebhookPayload;
  try {
    payload = JSON.parse(input.rawBody) as SanityWebhookPayload;
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (input.idempotencyKey) {
    const claimed = await deps.claimIdempotency(input.idempotencyKey);
    if (!claimed) {
      return Response.json({ ok: true, skipped: 'duplicate' });
    }
  }

  if (shouldIgnoreSanityWebhookPayload(payload)) {
    return Response.json({ ok: true, skipped: 'filtered' });
  }

  try {
    await deps.syncOne(payload._id);
    await deps.postSyncSideEffects(payload._id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync failed';
    console.error('[sanity-webhook] sync failed', { id: payload._id, message });
    return Response.json({ error: 'Sync failed' }, { status: 500 });
  }

  return Response.json({ ok: true });
}