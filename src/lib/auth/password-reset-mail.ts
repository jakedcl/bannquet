import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import {
  markPasswordResetEmailed,
  savePasswordResetLink,
} from '@/lib/auth/resets';
import {
  hashResetToken,
  newResetToken,
  passwordResetAudit,
  resetLinkExpiry,
} from '@/lib/passwords';
import { isResendConfigured, sendResendEmail } from '@/lib/auth/resend';

function resetEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: Helvetica, Arial, sans-serif; line-height: 1.5; color: #111;">
  <p>Someone asked to reset your Bannquet password.</p>
  <p><a href="${resetUrl}">Choose a new password</a></p>
  <p>This link works once and lasts 24 hours. If you did not ask for this, ignore the email.</p>
</body>
</html>`;
}

function resetEmailText(resetUrl: string): string {
  return `Someone asked to reset your Bannquet password.\n\nOpen this link to choose a new password (works once, lasts 24 hours):\n${resetUrl}\n\nIf you did not ask for this, ignore the email.`;
}

export async function sendPasswordResetEmailAtUrl(input: {
  memberId: string;
  email: string;
  origin: string;
  resetUrl: string;
  tokenHash: string;
}): Promise<{ ok: boolean; via: 'resend' | 'neon_auth' | 'none' }> {
  if (isResendConfigured()) {
    const sent = await sendResendEmail({
      to: input.email,
      subject: 'Reset your Bannquet password',
      html: resetEmailHtml(input.resetUrl),
      text: resetEmailText(input.resetUrl),
    });
    if (sent.ok) {
      await markPasswordResetEmailed(input.tokenHash);
      console.info('password reset email sent', {
        targetUserId: input.memberId,
        via: 'resend',
        resendId: sent.id,
      });
      return { ok: true, via: 'resend' };
    }
    console.error('password reset resend failed', {
      targetUserId: input.memberId,
      message: sent.message,
    });
  }

  if (!isAuthConfigured()) {
    return { ok: false, via: 'none' };
  }

  const { error } = await getAuth().requestPasswordReset({
    email: input.email,
    redirectTo: `${input.origin}/reset-password`,
  });
  if (error) {
    console.error('password reset neon auth failed', {
      targetUserId: input.memberId,
      code: error.code ?? null,
      message: error.message ?? 'unknown',
    });
    return { ok: false, via: 'none' };
  }

  await markPasswordResetEmailed(input.tokenHash);
  console.info('password reset email sent', { targetUserId: input.memberId, via: 'neon_auth' });
  return { ok: true, via: 'neon_auth' };
}

export async function deliverPasswordResetEmail(input: {
  memberId: string;
  email: string;
  createdBy: string;
  origin: string;
}): Promise<{ ok: boolean; url: string; via: 'resend' | 'neon_auth' | 'none' }> {
  const token = newResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = resetLinkExpiry();
  const audit = passwordResetAudit({
    actorId: input.createdBy,
    targetUserId: input.memberId,
    emailed: false,
    token,
  });
  if (audit.tokenHash !== tokenHash) {
    return { ok: false, url: '', via: 'none' };
  }

  await savePasswordResetLink({
    token,
    tokenHash,
    userId: input.memberId,
    createdBy: input.createdBy,
    expiresAt,
  });

  const url = `${input.origin}/reset-password?token=${encodeURIComponent(token)}`;
  const sent = await sendPasswordResetEmailAtUrl({
    memberId: input.memberId,
    email: input.email,
    origin: input.origin,
    resetUrl: url,
    tokenHash,
  });
  return { ok: sent.ok, url, via: sent.via };
}
