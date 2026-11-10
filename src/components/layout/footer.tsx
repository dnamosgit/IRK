import Link from 'next/link';
import { fmt, getDictionary, localizePath, type Locale } from '@/lib/i18n';
import { LanguageSwitcher } from './language-switcher';
import { LogoMark } from './logo';

export function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const h = (p: string) => localizePath(locale, p);
  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: h('/offices'), label: t.nav.offices },
        { href: h('/reviews'), label: t.nav.reviews },
        { href: h('/guides'), label: t.nav.guides },
        { href: h('/write-review'), label: t.nav.writeReview },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { href: h('/about'), label: t.nav.about },
        { href: h('/contact'), label: t.footer.contact },
        { href: h('/resources'), label: t.footer.officialResources },
      ],
    },
    {
      title: t.footer.policies,
      links: [
        { href: h('/legal/privacy'), label: t.legal.privacy },
        { href: h('/legal/terms'), label: t.legal.terms },
        { href: h('/legal/guidelines'), label: t.legal.guidelines },
        { href: h('/legal/moderation'), label: t.legal.moderation },
      ],
    },
    {
      title: t.footer.support,
      links: [
        { href: h('/contact?kind=problem'), label: t.footer.reportProblem },
        { href: h('/appeals'), label: t.footer.appeals },
        { href: h('/legal-requests'), label: t.footer.legalRequests },
      ],
    },
  ];

  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Link href={h('/')} className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8 text-white [--logo-fg:#101B2A]" />
              <span className="font-semibold">{t.meta.siteName}</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/60">{t.meta.tagline}</p>
            <div className="mt-6">
              <LanguageSwitcher tone="dark" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {columns.map((c) => (
              <div key={c.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{c.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-white/75 transition-colors hover:text-white">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl">{t.common.independent}</p>
          <p>{fmt(t.footer.rights, { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
