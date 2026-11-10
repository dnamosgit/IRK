import type { Metadata } from 'next';
import { ButtonLink, PageHeader } from '@/components/ui/primitives';
import { Check } from '@/components/ui/icons';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  const t = getDictionary(l);
  return pageMetadata(l, '/about', { title: t.about.title, description: t.about.lead });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  const block = (title: string, body: string) => (
    <section className="grid gap-4 border-t border-line py-10 md:grid-cols-[240px_1fr]">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-[1.05rem] leading-relaxed text-[#2b3542]">{body}</p>
    </section>
  );
  return (
    <>
      <PageHeader title={t.about.title} body={t.about.lead} />
      <div className="container-x max-w-4xl py-6">
        {block(t.about.missionTitle, t.about.mission)}
        <section className="grid gap-4 border-t border-line py-10 md:grid-cols-[240px_1fr]">
          <h2 className="text-lg font-semibold">{t.about.principlesTitle}</h2>
          <ul className="space-y-3">
            {t.about.principles.map((p) => (
              <li key={p} className="flex gap-3 text-[1.02rem] text-[#2b3542]"><Check size={18} className="mt-1 shrink-0 text-verified-text" />{p}</li>
            ))}
          </ul>
        </section>
        {block(t.about.notTitle, t.about.not)}
        {block(t.about.fundingTitle, t.about.funding)}
        {block(t.about.statusTitle, t.about.status)}
        <div className="flex flex-wrap gap-3 border-t border-line py-10">
          <ButtonLink href={localizePath(locale, '/legal/moderation')} variant="secondary">{t.legal.moderation}</ButtonLink>
          <ButtonLink href={localizePath(locale, '/legal/privacy')} variant="secondary">{t.legal.privacy}</ButtonLink>
          <ButtonLink href={localizePath(locale, '/contact')}>{t.footer.contact}</ButtonLink>
        </div>
      </div>
    </>
  );
}
