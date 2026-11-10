import 'server-only';
import { appDb } from '@/lib/db';

export type AbuseSignal = { type: string; detail?: string };

/**
 * Heuristic abuse signals attached to a moderation case. Signals never block a
 * submission on their own — they raise priority so a human looks closer.
 */
export async function detectAbuseSignals(input: {
  userId: string;
  officeId: string;
  body: string;
  ipHash: string;
  accountCreatedAt: string;
  excludeReviewId?: string;
}): Promise<AbuseSignal[]> {
  const signals: AbuseSignal[] = [];
  const ageHours = (Date.now() - new Date(input.accountCreatedAt).getTime()) / 3600000;
  if (ageHours < 24) signals.push({ type: 'new_account', detail: `${Math.round(ageHours * 10) / 10}h old` });

  const exclude = input.excludeReviewId ?? '00000000-0000-0000-0000-000000000000';
  const [burst, similar, spike, network, signupCluster] = await Promise.all([
    appDb.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.reviews WHERE user_id = $1 AND created_at > now() - interval '24 hours' AND id <> $2`,
      [input.userId, exclude],
    ),
    // near-duplicate text across all recent reviews (coordinated campaigns / copy-paste spam)
    appDb.query<{ id: string; sim: number }>(
      `SELECT id, similarity(body, $1) AS sim FROM public.reviews
        WHERE created_at > now() - interval '180 days' AND id <> $2 AND body % $1
        ORDER BY sim DESC LIMIT 3`,
      [input.body, exclude],
    ),
    // sudden spike for this office vs its 30-day daily average
    appDb.query<{ last24: number; avg30: number }>(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS last24,
              (count(*) FILTER (WHERE created_at > now() - interval '30 days') / 30.0)::float AS avg30
         FROM public.reviews WHERE office_id = $1`,
      [input.officeId],
    ),
    // several accounts submitting from the same network
    appDb.query<{ n: number }>(
      `SELECT count(DISTINCT r.user_id)::int AS n FROM private.moderation_cases mc JOIN public.reviews r ON r.id = mc.review_id
        WHERE mc.submission_ip_hash = $1 AND mc.created_at > now() - interval '7 days' AND r.user_id <> $2`,
      [input.ipHash, input.userId],
    ),
    appDb.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM private.users WHERE signup_ip_hash = $1 AND created_at > now() - interval '24 hours'`,
      [input.ipHash],
    ),
  ]);

  if (burst.rows[0].n >= 2) signals.push({ type: 'burst_user', detail: `${burst.rows[0].n + 1} reviews in 24h` });
  for (const s of similar.rows) if (s.sim >= 0.6) signals.push({ type: 'near_duplicate', detail: `${s.id} (${Math.round(s.sim * 100)}%)` });
  const { last24, avg30 } = spike.rows[0];
  if (last24 >= 5 && last24 > Math.max(3, avg30 * 3)) signals.push({ type: 'office_spike', detail: `${last24} in 24h vs ${avg30.toFixed(1)}/day` });
  if (network.rows[0].n >= 2) signals.push({ type: 'shared_network', detail: `${network.rows[0].n} other accounts in 7 days` });
  if (signupCluster.rows[0].n >= 3) signals.push({ type: 'signup_cluster', detail: `${signupCluster.rows[0].n} accounts from network in 24h` });
  return signals;
}
