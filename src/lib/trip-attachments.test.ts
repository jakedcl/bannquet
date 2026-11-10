import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canDetachTripAttachment } from '@/lib/trips';

describe('canDetachTripAttachment', () => {
  it('lets admins detach anything', () => {
    assert.equal(canDetachTripAttachment({
      admin: true,
      actorId: 'admin',
      tripCreatedBy: 'planner',
      itemOwnerId: 'other',
    }), true);
  });

  it('lets the trip planner detach any attachment', () => {
    assert.equal(canDetachTripAttachment({
      admin: false,
      actorId: 'planner',
      tripCreatedBy: 'planner',
      itemOwnerId: 'other',
    }), true);
  });

  it('lets the item owner detach their own attachment', () => {
    assert.equal(canDetachTripAttachment({
      admin: false,
      actorId: 'owner',
      tripCreatedBy: 'planner',
      itemOwnerId: 'owner',
    }), true);
  });

  it('blocks everyone else', () => {
    assert.equal(canDetachTripAttachment({
      admin: false,
      actorId: 'stranger',
      tripCreatedBy: 'planner',
      itemOwnerId: 'owner',
    }), false);
  });
});
