import type { Metadata } from 'next';
import { ReviewsSection } from '@/components/reviews/reviews-section';
import { Notice, PageHeader } from '@/components/ui/primitives';
import { config } from '@/lib/config';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  const t = getDictionary(l);
  return pageMetadata(l, '/reviews', { title: t.reviews.title, description: t.reviews.subtitle });
}

export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader eyebrow={t.home.recentEyebrow} title={t.reviews.title} body={t.reviews.subtitle} />
      <div className="container-x max-w-4xl py-10">
        {config.sampleMode && <Notice tone="warning" className="mb-6">{t.common.sampleNotice}</Notice>}
        <ReviewsSection locale={locale} searchParams={await searchParams} basePath="/reviews" showOffice writeHref={localizePath(locale, '/write-review')} />
      </div>
    </>
  );
}
