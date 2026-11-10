import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { attachToTripBlockedMessage, canAttachToTripMembership, canManageTripJoinRequests } from '@/lib/trip-join';

describe('canManageTripJoinRequests', () => {
  it('lets the organizer manage', () => {
    assert.equal(canManageTripJoinRequests({ actorId: 'a', admin: false, tripCreatedBy: 'a' }), true);
  });
  it('lets admins manage', () => {
    assert.equal(canManageTripJoinRequests({ actorId: 'x', admin: true, tripCreatedBy: 'a' }), true);
  });
  it('blocks others', () => {
    assert.equal(canManageTripJoinRequests({ actorId: 'b', admin: false, tripCreatedBy: 'a' }), false);
  });
});

describe('canAttachToTripMembership', () => {
  it('allows going members', () => {
    assert.equal(canAttachToTripMembership({
      actorId: 'm', admin: false, tripCreatedBy: 'o', membership: 'going',
    }), true);
  });
  it('blocks requested members', () => {
    assert.equal(canAttachToTripMembership({
      actorId: 'm', admin: false, tripCreatedBy: 'o', membership: 'requested',
    }), false);
  });
  it('allows organizer without membership row', () => {
    assert.equal(canAttachToTripMembership({
      actorId: 'o', admin: false, tripCreatedBy: 'o', membership: null,
    }), true);
  });
});

describe('attachToTripBlockedMessage', () => {
  it('mentions pending request', () => {
    assert.match(attachToTripBlockedMessage('requested'), /pending/i);
  });
});
