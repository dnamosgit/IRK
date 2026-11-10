import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { SeoulDusk } from '@/components/home/seoul-dusk';
import { CountUp, HeroMotion } from '@/components/home/hero-motion';
import { OfficeSearch } from '@/components/offices/office-search';
import { OfficeCard } from '@/components/offices/office-card';
import { ReviewCard } from '@/components/reviews/review-card';
import { ArrowDown, ArrowRight, BookOpen, Compass, Lock, PenLine, SearchIcon, ShieldCheck, Users } from '@/components/ui/icons';
import { ButtonLink, Notice, SectionHeading, buttonClass } from '@/components/ui/primitives';
import { listOffices, getPublicStats } from '@/lib/queries/offices';
import { getUserVotes, listPublishedReviews } from '@/lib/queries/reviews';
import { getCurrentUser } from '@/lib/auth/session';
import { GUIDES } from '@/lib/content/guides';
import { media } from '@/lib/media';
import { config } from '@/lib/config';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { jsonForScript } from '@/lib/safe-url';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(isLocale(locale) ? locale : 'en', '/');
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params;
  const locale = l as Locale;
  const t = getDictionary(locale);
  const h = (p: string) => localizePath(locale, p);
  const [stats, offices, recent, user] = await Promise.all([
    getPublicStats(),
    listOffices(locale, { sort: 'reviews', limit: 6 }),
    listPublishedReviews(locale, { sort: 'recent', pageSize: 3 }),
    getCurrentUser().catch(() => null),
  ]);
  const votes = await getUserVotes(user?.id, recent.reviews.map((r) => r.id));
  const hasReviewStats = stats.reviews > 0;

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: t.meta.siteName,
    url: config.siteUrl,
    description: t.meta.description,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(orgJsonLd) }} />

      {/* ---------------------------------------------------------- HERO */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink text-white" aria-labelledby="hero-title">
        <HeroMotion className="absolute inset-0 -z-10">
          {media.hero ? (
            <Image src={media.hero.src} alt={t.home.heroImageAlt} fill priority sizes="100vw" className="object-cover" data-parallax="0.1" />
          ) : (
            <SeoulDusk className="absolute inset-0 h-[112%] w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#08111d]/88 via-[#08111d]/45 to-transparent md:via-[#08111d]/30" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#08111d]/80 to-transparent" />
        </HeroMotion>

        <div className="container-x relative pb-20 pt-36 md:pb-28 md:pt-44">
          <div className="max-w-3xl">
            <p className="reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur-sm">
              <ShieldCheck size={14} className="text-[#7fd1b3]" />
              {t.home.heroEyebrow}
            </p>
            <h1 id="hero-title" className="reveal mt-6 text-[2.9rem] font-semibold leading-[1.02] tracking-[-0.035em] [animation-delay:80ms] sm:text-6xl md:text-[5.4rem]">
              {t.home.heroTitle}
            </h1>
            <p className="reveal mt-6 max-w-xl text-lg leading-relaxed text-white/75 [animation-delay:160ms] md:text-xl">
              {t.home.heroSubtitle}
            </p>
            <div className="reveal mt-10 max-w-2xl [animation-delay:240ms]">
              <OfficeSearch variant="hero" />
            </div>
            <div className="reveal mt-6 flex flex-wrap gap-3 [animation-delay:320ms]">
              <ButtonLink href={h('/offices')} variant="light" size="lg">
                {t.home.heroPrimary} <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href={h('/write-review')} variant="outline-light" size="lg">
                <PenLine size={18} /> {t.home.heroSecondary}
              </ButtonLink>
            </div>
          </div>
          {media.hero && <p className="mt-10 text-[0.7rem] text-white/45">{media.hero.credit} · {media.hero.licence}</p>}
        </div>
        <a href="#trust" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white md:flex">
          {t.home.scroll}
          <ArrowDown size={16} className="motion-safe:animate-bounce" />
        </a>
      </section>

      {/* ---------------------------------------------------------- TRUST */}
      <section id="trust" className="scroll-mt-16 border-b border-line bg-white">
        <div className="container-x py-16 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div data-reveal>
              <h2 className="text-2xl font-semibold md:text-3xl">{hasReviewStats ? t.home.trustTitle : t.home.newPlatformTitle}</h2>
              {!hasReviewStats && <p className="mt-4 text-muted-text">{t.home.newPlatformBody}</p>}
            </div>
            <dl data-reveal className={`grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line ${hasReviewStats ? 'md:grid-cols-4' : ''}`}>
              {[
                { label: t.home.statOffices, value: stats.offices, show: true },
                { label: t.home.statReviews, value: stats.reviews, show: hasReviewStats },
                { label: t.home.statVerified, value: stats.verified, show: hasReviewStats },
                { label: t.home.statLanguages, value: stats.languages, show: true },
              ].filter((s) => s.show).map((s) => (
                <div key={s.label} className="flex flex-col-reverse bg-white p-6">
                  <dt className="mt-1 text-sm text-muted-text">{s.label}</dt>
                  <dd className="text-4xl font-semibold tabular-nums tracking-tight"><CountUp value={s.value} /></dd>
                </div>
              ))}
            </dl>
          </div>
          <ul className="mt-14 grid gap-8 border-t border-line pt-10 md:grid-cols-3">
            {[
              { icon: <Compass size={20} />, title: t.home.principles.independentTitle, body: t.home.principles.independentBody },
              { icon: <Lock size={20} />, title: t.home.principles.privacyTitle, body: t.home.principles.privacyBody },
              { icon: <Users size={20} />, title: t.home.principles.moderatedTitle, body: t.home.principles.moderatedBody },
            ].map((p) => (
              <li key={p.title} data-reveal className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-accent-text">{p.icon}</span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-text">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- FEATURED OFFICES */}
      <section className="py-20 md:py-28" aria-labelledby="featured-title">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
            <div className="max-w-2xl">
              <p className="eyebrow mb-3">{t.home.featuredEyebrow}</p>
              <h2 id="featured-title" className="text-3xl font-semibold md:text-[2.6rem]">{t.home.featuredTitle}</h2>
              <p className="mt-4 text-[1.05rem] text-muted-text">{t.home.featuredBody}</p>
            </div>
            <Link href={h('/offices')} className="inline-flex items-center gap-1.5 font-medium text-accent-text hover:underline">
              {t.common.viewAll} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((o) => (
              <div key={o.id} data-reveal><OfficeCard office={o} locale={locale} /></div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- HOW IT WORKS */}
      <section className="border-y border-line bg-white py-20 md:py-28" aria-labelledby="how-title">
        <div className="container-x">
          <div data-reveal>
            <p className="eyebrow mb-3">{t.home.howEyebrow}</p>
            <h2 id="how-title" className="max-w-2xl text-3xl font-semibold md:text-[2.6rem]">{t.home.howTitle}</h2>
          </div>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { icon: <SearchIcon size={22} />, title: t.home.how1Title, body: t.home.how1Body },
              { icon: <BookOpen size={22} />, title: t.home.how2Title, body: t.home.how2Body },
              { icon: <PenLine size={22} />, title: t.home.how3Title, body: t.home.how3Body },
            ].map((s, i) => (
              <li key={s.title} data-reveal className="relative">
                <span className="text-sm font-semibold tabular-nums text-muted">0{i + 1}</span>
                <span className="mt-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-ink text-white">{s.icon}</span>
                <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-text">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- RECENT REVIEWS */}
      <section className="py-20 md:py-28" aria-labelledby="recent-title">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
            <div>
              <p className="eyebrow mb-3">{t.home.recentEyebrow}</p>
              <h2 id="recent-title" className="text-3xl font-semibold md:text-[2.6rem]">{t.home.recentTitle}</h2>
            </div>
            {recent.reviews.length > 0 && (
              <Link href={h('/reviews')} className="inline-flex items-center gap-1.5 font-medium text-accent-text hover:underline">
                {t.common.viewAll} <ArrowRight size={16} />
              </Link>
            )}
          </div>
          {config.sampleMode && recent.reviews.some((r) => r.isSample) && <Notice tone="warning" className="mt-8">{t.common.sampleNotice}</Notice>}
          {recent.reviews.length > 0 ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {recent.reviews.map((r) => (
                <div key={r.id} data-reveal><ReviewCard review={r} showOffice signedIn={!!user} voted={votes.has(r.id)} /></div>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
              <p className="mx-auto max-w-md text-muted-text">{t.home.recentEmpty}</p>
              <ButtonLink href={h('/write-review')} className="mt-6">{t.home.heroSecondary}</ButtonLink>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- EDUCATION (dark) */}
      <section className="relative overflow-hidden bg-ink py-20 text-white md:py-28" aria-labelledby="edu-title">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(84,121,155,0.35),transparent_65%)]" />
        <div className="container-x relative">
          <div data-reveal className="max-w-2xl">
            <p className="eyebrow mb-3 !text-[#a9c0d6]">{t.home.educationEyebrow}</p>
            <h2 id="edu-title" className="text-3xl font-semibold md:text-[2.6rem]">{t.home.educationTitle}</h2>
            <p className="mt-4 text-[1.05rem] text-white/65">{t.home.educationBody}</p>
          </div>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <li key={g.slug} data-reveal className="bg-ink">
                <Link href={h(`/guides/${g.slug}`)} className="group flex h-full flex-col p-6 transition-colors hover:bg-white/[0.04]">
                  <span className="text-lg font-semibold">{g.content[locale].title}</span>
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-white/60">{g.content[locale].summary}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#a9c0d6]">
                    {t.guides.readGuide} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- CTA */}
      <section className="py-20 md:py-24">
        <div className="container-x">
          <div data-reveal className="flex flex-col items-start justify-between gap-8 rounded-[var(--radius-lg)] border border-line bg-white p-8 md:flex-row md:items-center md:p-12">
            <SectionHeading title={t.home.ctaTitle} body={t.home.ctaBody} />
            <Link href={h('/write-review')} className={buttonClass('primary', 'lg', 'shrink-0')}>
              <PenLine size={18} /> {t.nav.writeReview}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
