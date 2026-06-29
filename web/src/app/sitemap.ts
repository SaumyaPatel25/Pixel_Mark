import { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seoConfig';

export default function sitemap(): MetadataRoute.Sitemap {
  const highPriority = ['', '/pricing'].map((route) => ({
    url: `${seoConfig.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))

  const contentPages = ['/docs/api', '/support/diagnostics', '/chrome-extension'].map((route) => ({
    url: `${seoConfig.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...highPriority, ...contentPages]
}
