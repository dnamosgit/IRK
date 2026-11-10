import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALIZED_SEGMENTS, isLocale } from '@/lib/i18n/config';
import { localizePath, parsePath } from '@/lib/i18n/paths';

// 1. Paths without a locale prefix are redirected to the visitor's saved
//    language, or English for new visitors.
// 2. Localized segments (/es/oficinas/...) are rewritten to internal routes
//    (/es/offices/...); internal segments under a localizing locale are
//    redirected to the canonical localized URL.
// 3. The locale cookie is refreshed so the preference persists.
// 4. /admin requires a session cookie (full role checks happen server-side).

const SESSION_COOKIE = 'irk_session';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (!request.cookies.get(SESSION_COOKIE)) {
      const locale = request.cookies.get(LOCALE_COOKIE)?.value;
      const url = request.nextUrl.clone();
      url.pathname = `/${isLocale(locale) ? locale : DEFAULT_LOCALE}/auth/sign-in`;
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const first = pathname.split('/')[1];
  if (!isLocale(first)) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
    const url = request.nextUrl.clone();
    url.pathname = localizePath(locale, pathname === '/' ? '' : pathname);
    return NextResponse.redirect(url);
  }

  const locale = first;
  const second = pathname.split('/')[2];
  let response: NextResponse;

  // canonical redirect: /es/offices -> /es/oficinas
  if (second && LOCALIZED_SEGMENTS[second]?.[locale]) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(locale, pathname.slice(locale.length + 1));
    return NextResponse.redirect(url, 308);
  }

  const { internalPath } = parsePath(pathname);
  const internalFull = `/${locale}${internalPath === '/' ? '' : internalPath}`;
  if (internalFull !== pathname && internalFull !== pathname.replace(/\/$/, '')) {
    const url = request.nextUrl.clone();
    url.pathname = internalFull;
    url.search = search;
    response = NextResponse.rewrite(url);
  } else {
    response = NextResponse.next();
  }

  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  response.headers.set('x-irk-pathname', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|images|fonts|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.[a-zA-Z0-9]+$).*)'],
};
