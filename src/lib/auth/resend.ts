export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && emailFrom());
}

export function emailFrom(): string | null {
  const from = process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM?.trim();
  return from || null;
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendResendEmail(input: SendEmailInput): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = emailFrom();
  if (!apiKey || !from) {
    return { ok: false, message: 'Resend is not configured.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { id?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    const message = body?.error?.message ?? `Resend returned ${response.status}`;
    return { ok: false, message };
  }
  if (!body?.id) return { ok: false, message: 'Resend did not return an email id.' };
  return { ok: true, id: body.id };
}
