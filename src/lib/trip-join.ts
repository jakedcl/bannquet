export type TripMemberRsvp = 'going' | 'requested' | 'maybe' | 'no';

/** Organizer or admin may approve/decline join requests. */
export function canManageTripJoinRequests(input: {
  actorId: string;
  admin: boolean;
  tripCreatedBy: string | null;
}): boolean {
  if (input.admin) return true;
  return Boolean(input.tripCreatedBy && input.tripCreatedBy === input.actorId);
}

/** Only going members, the organizer, or admins may attach their own items to a trip. */
export function canAttachToTripMembership(input: {
  actorId: string;
  admin: boolean;
  tripCreatedBy: string | null;
  membership: TripMemberRsvp | null;
}): boolean {
  if (input.admin) return true;
  if (input.tripCreatedBy && input.tripCreatedBy === input.actorId) return true;
  return input.membership === 'going';
}

export function attachToTripBlockedMessage(membership: TripMemberRsvp | null): string {
  if (membership === 'requested') {
    return 'Your join request is pending. Once you are going on this trip, you can attach your pins, routes, and photos.';
  }
  return 'Only people who are going on this trip (or the organizer) can attach items. Request to join from the trip page first.';
}
