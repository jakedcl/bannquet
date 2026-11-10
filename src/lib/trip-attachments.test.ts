import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canDetachTripAttachment } from '@/lib/trips';

describe('canDetachTripAttachment', () => {
  it('lets admins detach anything', () => {
    assert.equal(canDetachTripAttachment({
      admin: true,
      actorId: 'admin',
      itemOwnerId: 'other',
    }), true);
  });

  it('lets the item owner detach their own attachment', () => {
    assert.equal(canDetachTripAttachment({
      admin: false,
      actorId: 'owner',
      itemOwnerId: 'owner',
    }), true);
  });

  it('blocks the trip organizer from removing someone else\'s attachment', () => {
    assert.equal(canDetachTripAttachment({
      admin: false,
      actorId: 'planner',
      itemOwnerId: 'other',
    }), false);
  });

  it('blocks everyone else', () => {
    assert.equal(canDetachTripAttachment({
      admin: false,
      actorId: 'stranger',
      itemOwnerId: 'owner',
    }), false);
  });
});
