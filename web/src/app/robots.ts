import { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seoConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/features',
          '/docs/api',
          '/support/diagnostics',
          '/chrome-extension',
          '/faq',
          '/company',
          '/getting-started',
          '/llms.txt',
          '/site.webmanifest'
        ],
        disallow: [
          '/dashboard',
          '/sessions',
          '/canvas',
          '/projects',
          '/project',
          '/review',
          '/settings',
          '/t/',
          '/test/',
          '/auth/',
          '/api/',
          '/login',
          '/register',
          '/blueprint/'
        ],
      },
      {
        userAgent: ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Amazonbot'],
        allow: [
          '/',
          '/pricing',
          '/features',
          '/docs/api',
          '/support/diagnostics',
          '/chrome-extension',
          '/faq',
          '/company',
          '/getting-started',
          '/llms.txt'
        ],
        disallow: [
          '/dashboard',
          '/sessions',
          '/canvas',
          '/projects',
          '/api/'
        ],
      }
    ],
    sitemap: `${seoConfig.siteUrl}/sitemap.xml`,
  };
}
