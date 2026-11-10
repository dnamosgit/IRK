import { NextResponse } from 'next/server';
import { appDb, transaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { sameOrigin } from '@/lib/security';

// Toggle a helpful vote. Signed-in users only; one vote per user per review;
// authors cannot vote on their own review.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await rateLimit('helpful', 60, 3600, user.id))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const review = await appDb.query(`SELECT user_id FROM public.reviews WHERE id = $1 AND status = 'approved'`, [id]);
  if (!review.rowCount) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (review.rows[0].user_id === user.id) return NextResponse.json({ error: 'own_review' }, { status: 400 });

  const result = await transaction(async (c) => {
    const del = await c.query('DELETE FROM public.helpful_votes WHERE review_id = $1 AND user_id = $2', [id, user.id]);
    if (!del.rowCount) await c.query('INSERT INTO public.helpful_votes (review_id, user_id) VALUES ($1,$2)', [id, user.id]);
    const r = await c.query(
      `UPDATE public.reviews SET helpful_count = (SELECT count(*) FROM public.helpful_votes WHERE review_id = $1) WHERE id = $1 RETURNING helpful_count`,
      [id],
    );
    return { count: r.rows[0].helpful_count as number, voted: !del.rowCount };
  });
  return NextResponse.json(result);
}
