import { AdminHeader, Panel } from '@/components/admin/ui';
import { Notice } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { fmt } from '@/lib/i18n';

function Bars({ rows, label }: { rows: { k: string; v: number }[]; label: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  if (!rows.length) return <p className="text-sm text-muted-text">—</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.k} className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-sm">
          <span className="truncate text-muted-text">{r.k}</span>
          <span className="h-2 rounded-full bg-mist"><span className="block h-full rounded-full bg-accent" style={{ width: `${(r.v / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums">{label(r.v)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function Analytics() {
  await requireAdmin('analytics');
  const { t } = await adminDict();
  const [volume, langs, offices, trend, verif, turnaround] = await Promise.all([
    appDb.query(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS k, count(*)::int AS v FROM public.reviews WHERE NOT is_sample AND created_at > now() - interval '12 months' GROUP BY 1 ORDER BY 1`),
    appDb.query(`SELECT upper(original_language) AS k, count(*)::int AS v FROM public.reviews WHERE NOT is_sample GROUP BY 1 ORDER BY 2 DESC`),
    appDb.query(`SELECT coalesce(t.name, o.slug) AS k, count(r.id)::int AS v FROM public.offices o LEFT JOIN public.office_translations t ON t.office_id = o.id AND t.locale = 'en'
                   LEFT JOIN public.reviews r ON r.office_id = o.id AND NOT r.is_sample AND r.created_at > now() - interval '90 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 15`),
    appDb.query(`SELECT to_char(date_trunc('month', published_at), 'YYYY-MM') AS k, round(avg(overall_score), 2)::float AS v FROM public.reviews WHERE status = 'approved' AND NOT is_sample AND published_at > now() - interval '12 months' GROUP BY 1 ORDER BY 1`),
    appDb.query(`SELECT count(*) FILTER (WHERE verification = 'verified')::float / nullif(count(*), 0) AS rate FROM public.reviews WHERE status = 'approved' AND NOT is_sample`),
    appDb.query(`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM a.created_at - r.created_at) / 3600) AS h
                   FROM private.moderation_actions a JOIN public.reviews r ON r.id = a.review_id
                  WHERE a.action IN ('approve','reject') AND NOT r.is_sample AND a.created_at > now() - interval '90 days'`),
  ]);
  const rate = verif.rows[0].rate;
  const h = turnaround.rows[0].h;
  return (
    <>
      <AdminHeader title={t.admin.analytics} />
      <Notice tone="info" className="mb-6">Fictional sample reviews are excluded from all analytics.</Notice>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t.admin.verificationRate}><p className="text-3xl font-semibold tabular-nums">{rate === null ? '—' : `${Math.round(rate * 100)}%`}</p></Panel>
        <Panel title={t.admin.turnaround}><p className="text-3xl font-semibold tabular-nums">{h === null ? '—' : fmt(t.admin.hours, { value: Number(h).toFixed(1) })}</p></Panel>
        <Panel title={t.admin.reviewVolume}><Bars rows={volume.rows as { k: string; v: number }[]} label={(v) => String(v)} /></Panel>
        <Panel title={t.admin.languageDistribution}><Bars rows={langs.rows as { k: string; v: number }[]} label={(v) => String(v)} /></Panel>
        <Panel title={t.admin.officeActivity}><Bars rows={offices.rows as { k: string; v: number }[]} label={(v) => String(v)} /></Panel>
        <Panel title={t.admin.ratingTrend}><Bars rows={trend.rows as { k: string; v: number }[]} label={(v) => v.toFixed(2)} /></Panel>
      </div>
    </>
  );
}
