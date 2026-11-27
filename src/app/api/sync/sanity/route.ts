// Full Tomvanz ↔ Bannquet sync rules: https://github.com/jakedcl/tomvanz (project docs).

import { claimWebhookIdempotency } from '@/lib/tomvanz-sync/webhook-idempotency';
import {
  handleSanityWebhook,
  IDEMPOTENCY_HEADER_NAME,
  SIGNATURE_HEADER_NAME,
} from '@/lib/tomvanz-sync/sanity-webhook';
import { postSyncSideEffects, syncOne } from '@/lib/tomvanz-sync/sync-one';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER_NAME);
  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER_NAME);

  return handleSanityWebhook(
    {
      rawBody,
      signature,
      idempotencyKey,
      secret: process.env.SANITY_WEBHOOK_SECRET,
    },
    {
      syncOne: (sanityId) => syncOne(sanityId),
      claimIdempotency: claimWebhookIdempotency,
      postSyncSideEffects,
    },
  );
}