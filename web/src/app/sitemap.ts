import { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seoConfig';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/pricing'].map((route) => ({
    url: `${seoConfig.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  return routes;
}
