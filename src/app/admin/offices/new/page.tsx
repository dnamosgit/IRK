import { AdminHeader, Panel } from '@/components/admin/ui';
import { OfficeForm } from '@/components/admin/office-form';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';

export default async function NewOffice() {
  await requireAdmin('offices');
  const { t } = await adminDict();
  return (<><AdminHeader title={t.admin.newOffice} /><Panel><OfficeForm t={t} /></Panel></>);
}
