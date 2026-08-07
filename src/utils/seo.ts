import type { HeadObject } from '@vueuse/head';

export const SEO_CONFIG = {
  siteName: 'IT Tools',
  siteUrl: 'https://tools.eplus.dev',
  defaultTitle: 'IT Tools - Handy online tools for developers',
  defaultDescription:
    'Free online developer tools by ePlus.DEV: converters, encoders, generators, network utilities, text tools and more.',
  socialImage: 'https://tools.eplus.dev/banner.png?v=2',
  twitterHandle: '@david_nguyen94',
} as const;

interface SeoHeadOptions {
  title?: string
  description?: string
  path?: string
  keywords?: string[]
  noindex?: boolean
  type?: 'website' | 'article'
}

export function normalizeSeoPath(path = '/') {
  const withoutQueryOrHash = path.split(/[?#]/, 1)[0] || '/';
  const withLeadingSlash = withoutQueryOrHash.startsWith('/') ? withoutQueryOrHash : `/${withoutQueryOrHash}`;

  if (withLeadingSlash === '/') {
    return '/';
  }

  return withLeadingSlash.replace(/\/+$/, '');
}

export function getCanonicalUrl(path = '/') {
  return new URL(normalizeSeoPath(path), `${SEO_CONFIG.siteUrl}/`).toString();
}

export function getSeoTitle(title?: string) {
  if (!title) {
    return SEO_CONFIG.defaultTitle;
  }

  return title.includes(SEO_CONFIG.siteName) ? title : `${title} - ${SEO_CONFIG.siteName}`;
}

export function createSeoHead({
  title,
  description = SEO_CONFIG.defaultDescription,
  path = '/',
  keywords = [],
  noindex = false,
  type = 'website',
}: SeoHeadOptions = {}): HeadObject {
  const resolvedTitle = getSeoTitle(title);
  const canonicalUrl = getCanonicalUrl(path);
  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  return {
    title: resolvedTitle,
    link: [
      { rel: 'canonical', href: canonicalUrl },
    ],
    meta: [
      { name: 'description', content: description },
      ...(keywords.length > 0 ? [{ name: 'keywords', content: keywords.join(', ') }] : []),
      { name: 'robots', content: robots },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: SEO_CONFIG.siteName },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:title', content: resolvedTitle },
      { property: 'og:description', content: description },
      { property: 'og:image', content: SEO_CONFIG.socialImage },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: SEO_CONFIG.twitterHandle },
      { name: 'twitter:creator', content: SEO_CONFIG.twitterHandle },
      { name: 'twitter:title', content: resolvedTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: SEO_CONFIG.socialImage },
    ],
  };
}
