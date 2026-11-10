import { AdminHeader, Table, Td, inputCls } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  await requireAdmin('audit');
  const { t } = await adminDict();
  const action = ((await searchParams).action ?? '').slice(0, 60);
  const rows = (await appDb.query(
    `SELECT a.*, p.display_name FROM private.audit_logs a LEFT JOIN public.user_profiles p ON p.user_id = a.actor_user_id
      WHERE ($1 = '' OR a.action LIKE $1 || '%') ORDER BY a.id DESC LIMIT 300`, [action])).rows;
  return (
    <>
      <AdminHeader title={t.admin.audit}>
        <form method="get" className="flex gap-2"><input name="action" defaultValue={action} placeholder="review. / verification." className={inputCls} /><button className="h-10 rounded-[var(--radius-md)] bg-ink px-4 text-sm text-white">{t.common.search}</button></form>
      </AdminHeader>
      <Table head={['Time (UTC)', 'Actor', 'Action', 'Target', 'Metadata']}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap font-mono text-xs">{new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19)}</Td>
            <Td className="text-xs">{r.display_name ?? (r.actor_user_id ? r.actor_user_id.slice(0, 8) : 'system')}</Td>
            <Td className="font-medium">{r.action}</Td>
            <Td className="font-mono text-xs">{r.target_type}:{r.target_id?.slice(0, 13)}</Td>
            <Td className="max-w-xs truncate font-mono text-xs text-muted-text">{JSON.stringify(r.metadata)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
