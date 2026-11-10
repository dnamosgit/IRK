import { NextResponse } from 'next/server';
import { searchSuggestions } from '@/lib/queries/offices';
import { getDictionary, isLocale } from '@/lib/i18n';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').slice(0, 80);
  const localeParam = url.searchParams.get('locale');
  const locale = isLocale(localeParam) ? localeParam : 'en';
  if (!(await rateLimit('search', 120, 60))) return NextResponse.json({ results: [] }, { status: 429 });
  const t = getDictionary(locale);
  const results = (await searchSuggestions(locale, q)).map((s) => ({
    slug: s.slug,
    name: s.name,
    secondary: s.secondary,
    city: (t.cities as Record<string, string>)[s.cityKey] ?? s.cityKey,
  }));
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
}
