import { ActionForm } from '@/components/admin/action-form';
import { AdminHeader, inputCls, textareaCls } from '@/components/admin/ui';
import { Badge, Notice } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { getTranslationProvider } from '@/lib/translation/providers';
import { approveTranslationAction, correctTranslationAction, reprocessTranslationAction } from '@/lib/actions/admin';

export default async function AdminTranslations() {
  await requireAdmin('translations');
  const { t } = await adminDict();
  const rows = (await appDb.query(
    `SELECT tr.*, r.title AS original_title, r.body AS original_body, r.status AS review_status,
            (SELECT count(*) FROM private.translation_reports x WHERE x.translation_id = tr.id AND x.status = 'open')::int AS reports
       FROM public.review_translations tr JOIN public.reviews r ON r.id = tr.review_id
      WHERE tr.status IN ('pending','failed','needs_human_review','unavailable')
         OR EXISTS (SELECT 1 FROM private.translation_reports x WHERE x.translation_id = tr.id AND x.status = 'open')
      ORDER BY (tr.status = 'needs_human_review') DESC, tr.created_at ASC LIMIT 50`)).rows;
  const provider = getTranslationProvider().name;
  return (
    <>
      <AdminHeader title={t.admin.translations}><Badge tone={provider === 'none' ? 'warning' : 'accent'}>provider: {provider}</Badge></AdminHeader>
      {provider === 'none' && <Notice tone="warning" className="mb-6">No machine translation provider is configured (TRANSLATION_PROVIDER). Reviews are shown in their original language until a provider is configured or a human translation is saved.</Notice>}
      {rows.length === 0 ? <p className="text-sm text-muted-text">{t.admin.noItems}</p> : (
        <ul className="space-y-4">
          {rows.map((x) => (
            <li key={x.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={x.status === 'needs_human_review' ? 'warning' : x.status === 'failed' ? 'danger' : 'neutral'}>{x.status}</Badge>
                <span>{x.source_language.toUpperCase()} → {x.target_language.toUpperCase()}</span><span className="text-xs text-muted-text">{x.engine}</span>
                {x.reports > 0 && <Badge tone="danger">{x.reports} report(s)</Badge>}
              </div>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div lang={x.source_language} className="text-sm"><p className="text-xs font-semibold uppercase text-muted-text">{t.admin.original}</p>{x.original_title && <p className="font-medium">{x.original_title}</p>}<p className="whitespace-pre-line">{x.original_body}</p></div>
                <ActionForm action={correctTranslationAction} className="space-y-2">
                  <input type="hidden" name="translationId" value={x.id} />
                  <input name="title" defaultValue={x.translated_title ?? ''} className={inputCls} lang={x.target_language} aria-label="Title" />
                  <textarea name="body" rows={6} defaultValue={x.translated_body ?? ''} className={textareaCls} lang={x.target_language} aria-label="Translation" />
                  <button className="h-9 rounded-[var(--radius-md)] bg-ink px-3 text-sm text-white">{t.admin.approveManual}</button>
                </ActionForm>
              </div>
              <div className="mt-3 flex gap-4">
                {x.status === 'needs_human_review' && <ActionForm action={approveTranslationAction}><input type="hidden" name="translationId" value={x.id} /><button className="text-sm text-verified-text hover:underline">{t.admin.approve}</button></ActionForm>}
                <ActionForm action={reprocessTranslationAction}><input type="hidden" name="reviewId" value={x.review_id} /><button className="text-sm text-accent-text hover:underline">{t.admin.reprocess}</button></ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
