import { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seoConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/pricing', '/login', '/register'],
      disallow: [
        '/dashboard/',
        '/sessions/',
        '/canvas/',
        '/projects/',
        '/project/',
        '/review/',
        '/settings/',
        '/t/',
        '/test/',
        '/auth/',
        '/api/'
      ],
    },
    sitemap: `${seoConfig.siteUrl}/sitemap.xml`,
  };
}
