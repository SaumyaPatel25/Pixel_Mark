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
        // Real-time AI Search Crawlers for live RAG and conversational citations
        userAgent: [
          'OAI-SearchBot',
          'Claude-SearchBot',
          'PerplexityBot',
          'ChatGPT-User',
          'Claude-User',
          'Applebot-Extended',
          'Meta-ExternalAgent',
          'Diffbot'
        ],
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
          '/auth/',
          '/api/'
        ],
      },
      {
        // Foundation Model Dataset Scrapers
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Amazonbot', 'Bytespider'],
        allow: [
          '/',
          '/pricing',
          '/features',
          '/docs/api',
          '/faq',
          '/company',
          '/llms.txt'
        ],
        disallow: [
          '/dashboard',
          '/sessions',
          '/canvas',
          '/projects',
          '/api/',
          '/review',
          '/settings'
        ],
      }
    ],
    sitemap: `${seoConfig.siteUrl}/sitemap.xml`,
  };
}
