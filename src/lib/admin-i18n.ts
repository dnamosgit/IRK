import 'server-only';
import { cookies } from 'next/headers';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';

/** Admin uses the visitor's saved interface language (EN default). */
export async function adminLocale(): Promise<Locale> {
  const c = (await cookies()).get('NEXT_LOCALE')?.value;
  return isLocale(c) ? c : 'en';
}

export async function adminDict() {
  const locale = await adminLocale();
  return { locale, t: getDictionary(locale) };
}
