import { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seoConfig';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/pricing', '/login', '/register'].map((route) => ({
    url: `${seoConfig.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : (route === '/pricing' ? 0.8 : 0.5),
  }));

  return routes;
}
