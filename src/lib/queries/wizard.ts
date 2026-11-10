import 'server-only';
import { listOffices } from './offices';
import { formatMonth, getDictionary, type Locale } from '@/lib/i18n';
import type { WizardOffice } from '@/components/forms/review-wizard';

export async function wizardOffices(locale: Locale): Promise<WizardOffice[]> {
  const t = getDictionary(locale);
  const offices = await listOffices(locale, { sort: 'name' });
  return offices.map((o) => ({
    id: o.id, slug: o.slug, name: o.name, nameKo: o.nameKo,
    place: (t.cities as Record<string, string>)[o.cityKey] ?? o.cityKey,
  }));
}

/** The current month and the previous 24, newest first. */
export function monthOptions(locale: Locale, now = new Date()) {
  return Array.from({ length: 25 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return { value: d.toISOString().slice(0, 7), label: formatMonth(locale, d) };
  });
}
