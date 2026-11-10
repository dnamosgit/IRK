import 'server-only';
import { appDb } from '@/lib/db';

// EMAIL_PROVIDER=console (development): messages are written to the private
// dev outbox table and readable at /{locale}/dev/outbox (disabled in production).
// EMAIL_PROVIDER=resend: sends through the Resend HTTP API (RESEND_API_KEY).

type Message = { to: string; subject: string; text: string };

export async function sendEmail(msg: Message): Promise<void> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Email provider error ${res.status}`);
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    // Never silently drop mail in production.
    throw new Error('No email provider configured. Set EMAIL_PROVIDER=resend and RESEND_API_KEY.');
  }
  await appDb.query(
    'INSERT INTO private.email_outbox (to_address, subject, body, provider) VALUES ($1,$2,$3,$4)',
    [msg.to, msg.subject, msg.text, 'console'],
  );
  console.info(`[dev email] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
}
