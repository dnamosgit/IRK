import { notFound } from 'next/navigation';
import { appDb } from '@/lib/db';
import { config } from '@/lib/config';

export const metadata = { robots: { index: false, follow: false } };

// DEVELOPMENT ONLY: shows emails "sent" by EMAIL_PROVIDER=console. 404 in production.
export default async function DevOutbox() {
  if (config.isProduction || (process.env.EMAIL_PROVIDER ?? 'console') !== 'console') notFound();
  const r = await appDb.query('SELECT id, to_address, subject, body, created_at FROM private.email_outbox ORDER BY id DESC LIMIT 30');
  const linkify = (s: string) => s.split(/(https?:\/\/\S+)/g).map((part, i) => part.startsWith('http') ? <a key={i} href={part} className="break-all text-accent-text underline">{part}</a> : part);
  return (
    <div className="container-x max-w-3xl py-12">
      <p className="eyebrow">Development</p>
      <h1 className="mt-2 text-3xl font-semibold">Email outbox</h1>
      <p className="mt-2 text-sm text-muted-text">Messages are not delivered in development. Configure EMAIL_PROVIDER=resend for real delivery.</p>
      <ul className="mt-8 space-y-4">
        {r.rows.map((m) => (
          <li key={m.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
            <p className="text-xs text-muted-text">{new Date(m.created_at).toLocaleString()} · to {m.to_address}</p>
            <p className="mt-1 font-semibold">{m.subject}</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{linkify(m.body)}</pre>
          </li>
        ))}
        {r.rowCount === 0 && <li className="text-sm text-muted-text">No messages.</li>}
      </ul>
    </div>
  );
}
