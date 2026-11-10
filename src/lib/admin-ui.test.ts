import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { adminPowerActing, adminPowerLabel } from '@/lib/admin-ui';

describe('adminPowerActing', () => {
  it('is false for members and pending users', () => {
    assert.equal(adminPowerActing({ role: 'member', actorId: 'a', ownerId: 'b' }), false);
    assert.equal(adminPowerActing({ role: 'pending', actorId: 'a', ownerId: 'b' }), false);
  });

  it('is false when admin acts on their own item', () => {
    assert.equal(adminPowerActing({ role: 'admin', actorId: 'jake', ownerId: 'jake' }), false);
  });

  it('is false without an owner id', () => {
    assert.equal(adminPowerActing({ role: 'admin', actorId: 'jake', ownerId: null }), false);
    assert.equal(adminPowerActing({ role: 'admin', actorId: 'jake', ownerId: '' }), false);
  });

  it('is true when admin acts on someone else\'s item', () => {
    assert.equal(adminPowerActing({ role: 'admin', actorId: 'jake', ownerId: 'other' }), true);
  });
});

describe('adminPowerLabel', () => {
  it('prefixes Admin for title and aria', () => {
    const labeled = adminPowerLabel('Delete route');
    assert.equal(labeled.title, 'Admin: Delete route');
    assert.equal(labeled.ariaLabel, 'Admin: Delete route');
  });
});
