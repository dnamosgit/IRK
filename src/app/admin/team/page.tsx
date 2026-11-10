import { ActionForm } from '@/components/admin/action-form';
import { AdminHeader, Panel, Table, Td, inputCls } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { ADMIN_ROLES } from '@/lib/rbac';
import { grantRoleAction, revokeRoleAction } from '@/lib/actions/admin';

export default async function Team() {
  await requireAdmin('team');
  const { t } = await adminDict();
  const rows = (await appDb.query(
    `SELECT a.user_id, a.role, a.granted_at, u.email, p.display_name FROM private.admin_users a
       JOIN private.users u ON u.id = a.user_id JOIN public.user_profiles p ON p.user_id = a.user_id ORDER BY u.email, a.role`)).rows;
  return (
    <>
      <AdminHeader title={t.admin.team} />
      <Panel title={t.admin.grantRole} className="mb-6">
        <ActionForm action={grantRoleAction} className="flex flex-wrap gap-2" resetOnSuccess>
          <input name="email" type="email" required placeholder={t.admin.userEmail} className={`${inputCls} max-w-sm`} />
          <select name="role" className={`${inputCls} max-w-xs`}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{t.admin.roles[r]}</option>)}</select>
          <button className="h-10 rounded-[var(--radius-md)] bg-ink px-4 text-sm text-white">{t.admin.grantRole}</button>
        </ActionForm>
        <p className="mt-3 text-xs text-muted-text">Moderators cannot see verification evidence or account emails. Verification reviewers cannot see review text or identities. Grant the minimum role needed.</p>
      </Panel>
      <Table head={[t.admin.userEmail, 'Role', 'Granted', '']}>
        {rows.map((r) => (
          <tr key={`${r.user_id}-${r.role}`}>
            <Td>{r.email}<span className="block text-xs text-muted-text">{r.display_name}</span></Td>
            <Td>{t.admin.roles[r.role as keyof typeof t.admin.roles]}</Td>
            <Td className="text-xs">{new Date(r.granted_at).toISOString().slice(0, 10)}</Td>
            <Td><ActionForm action={revokeRoleAction}><input type="hidden" name="userId" value={r.user_id} /><input type="hidden" name="role" value={r.role} /><button className="text-sm text-danger hover:underline">{t.admin.revokeRole}</button></ActionForm></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
