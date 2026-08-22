import { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seoConfig';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/features', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/docs/api', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/chrome-extension', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/support/diagnostics', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/company', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/getting-started', priority: 0.6, changeFrequency: 'monthly' as const },
  ];

  return routes.map((route) => ({
    url: `${seoConfig.siteUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
