import { ActionForm } from './action-form';
import { inputCls, textareaCls } from './ui';
import { saveOfficeAction } from '@/lib/actions/admin';
import { OFFICE_TYPES, REGIONS, SERVICE_CATEGORIES } from '@/lib/config';
import type { Dictionary } from '@/lib/i18n';

type Office = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function OfficeForm({ t, office, names }: { t: Dictionary; office?: Office; names?: Record<string, { name: string; address: string | null }> }) {
  const f = (label: string, input: React.ReactNode) => <label className="block text-xs font-medium text-muted-text">{label}<div className="mt-1">{input}</div></label>;
  return (
    <ActionForm action={saveOfficeAction} className="space-y-5">
      {office && <input type="hidden" name="id" value={office.id} />}
      <div className="grid gap-4 md:grid-cols-3">
        {f('Slug', <input name="slug" required defaultValue={office?.slug} className={inputCls} pattern="[a-z0-9-]+" />)}
        {f(t.office.category, <select name="type" defaultValue={office?.office_type ?? 'immigration_office'} className={inputCls}>{OFFICE_TYPES.map((o) => <option key={o} value={o}>{t.officeTypes[o]}</option>)}</select>)}
        {f(t.directory.filterRegion, <select name="regionKey" defaultValue={office?.region_key ?? 'seoul'} className={inputCls}>{REGIONS.map((r) => <option key={r} value={r}>{t.regions[r]}</option>)}</select>)}
        {f('Official name (KO)', <input name="nameKo" required lang="ko" defaultValue={office?.official_name_ko ?? names?.ko?.name} className={inputCls} />)}
        {f('Name (EN)', <input name="nameEn" required defaultValue={names?.en?.name} className={inputCls} />)}
        {f('Name (ES)', <input name="nameEs" required defaultValue={names?.es?.name} className={inputCls} />)}
        {f('City key', <input name="cityKey" required defaultValue={office?.city_key} className={inputCls} />)}
        {f(t.office.phone, <input name="phone" defaultValue={office?.phone ?? ''} className={inputCls} />)}
        {f('Location precision', <select name="precision" defaultValue={office?.location_precision ?? 'exact'} className={inputCls}><option value="exact">exact</option><option value="approximate_city">approximate_city</option><option value="unknown">unknown</option></select>)}
        {f('Latitude', <input name="latitude" inputMode="decimal" defaultValue={office?.latitude ?? ''} className={inputCls} />)}
        {f('Longitude', <input name="longitude" inputMode="decimal" defaultValue={office?.longitude ?? ''} className={inputCls} />)}
        {f(t.office.website, <input name="websiteUrl" type="url" defaultValue={office?.website_url ?? ''} className={inputCls} />)}
        {f(t.office.appointmentsSource, <input name="appointmentInfoUrl" type="url" defaultValue={office?.appointment_info_url ?? ''} className={inputCls} />)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {f(`${t.office.address} (KO)`, <input name="addressKo" lang="ko" defaultValue={office?.address_ko ?? ''} className={inputCls} />)}
        {f(`${t.office.address} (EN)`, <input name="addressEn" defaultValue={names?.en?.address ?? ''} className={inputCls} />)}
        {f(`${t.office.address} (ES)`, <input name="addressEs" defaultValue={names?.es?.address ?? ''} className={inputCls} />)}
      </div>
      <fieldset>
        <legend className="text-xs font-medium text-muted-text">{t.office.services}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {SERVICE_CATEGORIES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm"><input type="checkbox" name="services" value={s} defaultChecked={office?.services?.includes(s)} className="accent-ink" />{t.services[s]}</label>
          ))}
        </div>
      </fieldset>
      {f(t.office.dataSource, <textarea name="dataSource" rows={2} defaultValue={office?.data_source ?? ''} className={textareaCls} />)}
      <p className="text-xs text-muted-text">Only enter information confirmed from an official source. Contact details stay hidden publicly until the record is marked verified.</p>
      <button className="h-10 rounded-[var(--radius-md)] bg-ink px-5 text-sm font-medium text-white">{t.common.save}</button>
    </ActionForm>
  );
}
