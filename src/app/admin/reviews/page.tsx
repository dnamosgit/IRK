import Link from 'next/link';
import { AdminHeader, Table, Tabs, Td } from '@/components/admin/ui';
import { Badge } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { REVIEW_STATUSES } from '@/lib/config';

const PRIORITY_TONE = { urgent: 'danger', high: 'warning', normal: 'accent', low: 'neutral' } as const;

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin('reviews');
  const { t } = await adminDict();
  const sp = await searchParams;
  const status = (REVIEW_STATUSES as readonly string[]).includes(sp.status ?? '') ? sp.status! : 'pending';
  const counts = Object.fromEntries((await appDb.query(`SELECT status::text, count(*)::int AS n FROM public.reviews GROUP BY status`)).rows.map((r) => [r.status, r.n]));
  const rows = (await appDb.query(
    `SELECT r.id, r.status, r.created_at, r.original_language, r.service_category, r.overall_score, r.is_sample,
            coalesce(tl.name, o.official_name_ko) AS office, mc.priority,
            jsonb_array_length(coalesce(mc.screening_flags,'[]')) AS flags, jsonb_array_length(coalesce(mc.abuse_signals,'[]')) AS signals,
            (SELECT count(*) FROM private.review_reports rr WHERE rr.review_id = r.id AND rr.status = 'open')::int AS reports
       FROM public.reviews r JOIN public.offices o ON o.id = r.office_id
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = 'en'
       LEFT JOIN private.moderation_cases mc ON mc.review_id = r.id
      WHERE r.status = $1
      ORDER BY CASE mc.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, r.created_at ASC
      LIMIT 200`,
    [status],
  )).rows;
  return (
    <>
      <AdminHeader title={t.admin.reviews} />
      <Tabs current={status} items={REVIEW_STATUSES.map((s) => ({ key: s, href: `/admin/reviews?status=${s}`, label: t.account.statuses[s], count: counts[s] ?? 0 }))} />
      {rows.length === 0 ? <p className="text-sm text-muted-text">{t.admin.noItems}</p> : (
        <Table head={[t.admin.priority, t.office.breadcrumb, t.reviews.filterService, t.admin.flags, t.admin.signals, t.report.title, '']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.priority && <Badge tone={PRIORITY_TONE[r.priority as keyof typeof PRIORITY_TONE]}>{r.priority}</Badge>}</Td>
              <Td><span className="font-medium">{r.office}</span><span className="block text-xs text-muted-text">{new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')} · {r.original_language.toUpperCase()} · {Number(r.overall_score).toFixed(1)}{r.is_sample ? ' · SAMPLE' : ''}</span></Td>
              <Td>{t.services[r.service_category as keyof typeof t.services]}</Td>
              <Td className="tabular-nums">{r.flags}</Td>
              <Td className="tabular-nums">{r.signals}</Td>
              <Td className="tabular-nums">{r.reports}</Td>
              <Td><Link href={`/admin/reviews/${r.id}`} className="font-medium text-accent-text hover:underline">{t.common.view}</Link></Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
