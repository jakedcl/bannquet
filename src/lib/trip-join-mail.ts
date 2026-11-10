import { findMemberByAuthId } from '@/lib/auth/members';
import { isResendConfigured, sendResendEmail } from '@/lib/auth/resend';

const SITE = 'https://www.bannquet.com';

function tripUrl(tripId: string): string {
  return `${SITE}/trips/${tripId}`;
}

async function emailUser(userId: string, subject: string, text: string, html: string): Promise<void> {
  if (!isResendConfigured()) return;
  const member = await findMemberByAuthId(userId);
  const to = member?.email?.trim();
  if (!to) return;
  try {
    await sendResendEmail({ to, subject, text, html });
  } catch {
    // Best-effort only.
  }
}

export async function emailTripJoinRequested(input: {
  organizerId: string;
  requesterName: string;
  tripTitle: string;
  tripId: string;
}): Promise<void> {
  const subject = `${input.requesterName} requested to join ${input.tripTitle}`;
  const link = tripUrl(input.tripId);
  const text = `${input.requesterName} requested to join your trip "${input.tripTitle}".\n\nReview requests: ${link}`;
  const html = `<p><strong>${input.requesterName}</strong> requested to join your trip <strong>${input.tripTitle}</strong>.</p><p><a href="${link}">Review on Bannquet</a></p>`;
  await emailUser(input.organizerId, subject, text, html);
}

export async function emailTripJoinApproved(input: {
  requesterId: string;
  tripTitle: string;
  tripId: string;
}): Promise<void> {
  const subject = `You are going on ${input.tripTitle}`;
  const link = tripUrl(input.tripId);
  const text = `Your request to join "${input.tripTitle}" was approved.\n\n${link}`;
  const html = `<p>Your request to join <strong>${input.tripTitle}</strong> was approved.</p><p><a href="${link}">View the trip</a></p>`;
  await emailUser(input.requesterId, subject, text, html);
}

export async function emailTripJoinDeclined(input: {
  requesterId: string;
  tripTitle: string;
  tripId: string;
}): Promise<void> {
  const subject = `Update on ${input.tripTitle}`;
  const link = tripUrl(input.tripId);
  const text = `Your request to join "${input.tripTitle}" was declined.\n\n${link}`;
  const html = `<p>Your request to join <strong>${input.tripTitle}</strong> was declined.</p><p><a href="${link}">View the trip</a></p>`;
  await emailUser(input.requesterId, subject, text, html);
}
