import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeSignatureHeader } from '@sanity/webhook';
import {
  handleSanityWebhook,
  shouldIgnoreSanityWebhookPayload,
} from './sanity-webhook';

const SECRET = 'test-webhook-secret-for-unit-tests';

async function signedBody(payload: Record<string, unknown>): Promise<{ rawBody: string; signature: string }> {
  const rawBody = JSON.stringify(payload);
  const signature = await encodeSignatureHeader(rawBody, Date.now(), SECRET);
  return { rawBody, signature };
}

function mockDeps(overrides: Partial<Parameters<typeof handleSanityWebhook>[1]> = {}) {
  return {
    syncOne: async () => ({ outcome: 'updated' }),
    claimIdempotency: async () => true,
    postSyncSideEffects: async () => {},
    ...overrides,
  };
}

test('shouldIgnoreSanityWebhookPayload skips draft ids and non photo/track types', () => {
  assert.equal(shouldIgnoreSanityWebhookPayload({ _id: 'drafts.abc', _type: 'photo' }), true);
  assert.equal(shouldIgnoreSanityWebhookPayload({ _id: 'versions.foo', _type: 'track' }), true);
  assert.equal(shouldIgnoreSanityWebhookPayload({ _id: 'live', _type: 'flight' }), true);
  assert.equal(shouldIgnoreSanityWebhookPayload({ _id: 'live', _type: 'photo' }), false);
});

test('bad signature returns 401', async () => {
  const { rawBody } = await signedBody({ _id: 'a', _type: 'photo', op: 'update' });
  const response = await handleSanityWebhook(
    { rawBody, signature: 't=1,v1=bad', idempotencyKey: null, secret: SECRET },
    mockDeps(),
  );
  assert.equal(response.status, 401);
});

test('draft ids are ignored with 200', async () => {
  const { rawBody, signature } = await signedBody({ _id: 'drafts.x', _type: 'photo', op: 'create' });
  let called = false;
  const response = await handleSanityWebhook(
    { rawBody, signature, idempotencyKey: null, secret: SECRET },
    mockDeps({
      syncOne: async () => {
        called = true;
        return { outcome: 'skipped' };
      },
    }),
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { skipped?: string };
  assert.equal(body.skipped, 'filtered');
  assert.equal(called, false);
});

test('wrong types are ignored with 200', async () => {
  const { rawBody, signature } = await signedBody({ _id: 'published', _type: 'flight', op: 'update' });
  let called = false;
  const response = await handleSanityWebhook(
    { rawBody, signature, idempotencyKey: null, secret: SECRET },
    mockDeps({
      syncOne: async () => {
        called = true;
        return { outcome: 'skipped' };
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(called, false);
});

test('repeat idempotency key is a no-op', async () => {
  const { rawBody, signature } = await signedBody({ _id: 'photo-1', _type: 'photo', op: 'update' });
  let syncCalls = 0;
  const response = await handleSanityWebhook(
    { rawBody, signature, idempotencyKey: 'same-key', secret: SECRET },
    mockDeps({
      claimIdempotency: async () => false,
      syncOne: async () => {
        syncCalls += 1;
        return { outcome: 'updated' };
      },
    }),
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { skipped?: string };
  assert.equal(body.skipped, 'duplicate');
  assert.equal(syncCalls, 0);
});

test('delete routes to syncOne', async () => {
  const { rawBody, signature } = await signedBody({ _id: 'deleted-doc', _type: 'track', op: 'delete' });
  const seen: string[] = [];
  const response = await handleSanityWebhook(
    { rawBody, signature, idempotencyKey: null, secret: SECRET },
    mockDeps({
      syncOne: async (id) => {
        seen.push(id);
        return { outcome: 'deleted' };
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(seen, ['deleted-doc']);
});