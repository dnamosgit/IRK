import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ['/admin', '/api/', '/*/account', '/*/cuenta', '/*/auth/', '/*/write-review', '/*/escribir-resena', '/*/dev/', '/*/appeals'];
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: privatePaths }],
    sitemap: `${config.siteUrl}/sitemap.xml`,
    host: config.siteUrl,
  };
}
