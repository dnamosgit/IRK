import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { purgeExpiredEvidence } from '@/lib/evidence';

// Scheduled job: delete verification evidence past its retention period.
// Call daily, e.g. Vercel Cron with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const purged = await purgeExpiredEvidence();
  return NextResponse.json({ purged });
}
