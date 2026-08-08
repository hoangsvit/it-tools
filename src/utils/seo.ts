import type { HeadObject } from '@vueuse/head';

export const SEO_CONFIG = {
  siteName: 'IT Tools',
  siteUrl: 'https://tools.eplus.dev',
  defaultTitle: 'IT Tools - Handy online tools for developers',
  defaultDescription:
    'Free online developer tools by ePlus.DEV: converters, encoders, generators, network utilities, text tools and more.',
  socialImage: 'https://tools.eplus.dev/banner.png?v=2',
  socialImageAlt: 'IT Tools - Handy online tools for developers',
  twitterHandle: '@david_nguyen94',
  language: 'en',
  locale: 'en_US',
  maintainerName: 'David Nguyen',
  maintainerUrl: 'https://github.com/hoangsvit',
  repositoryUrl: 'https://github.com/hoangsvit/it-tools',
  licenseUrl: 'https://www.gnu.org/licenses/gpl-3.0.html',
} as const;

type SeoPageKind = 'home' | 'tool' | 'workspace' | 'about' | 'page';

interface SeoHeadOptions {
  title?: string
  description?: string
  path?: string
  keywords?: string[]
  noindex?: boolean
  type?: 'website' | 'article'
  pageKind?: SeoPageKind
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

export function resolveSeoPageKind(path = '/', pageKind?: SeoPageKind): SeoPageKind {
  if (pageKind) {
    return pageKind;
  }

  const normalizedPath = normalizeSeoPath(path);
  if (normalizedPath === '/') {
    return 'home';
  }
  if (normalizedPath === '/about') {
    return 'about';
  }
  if (normalizedPath === '/workspace') {
    return 'workspace';
  }

  return 'tool';
}

function getSchemaIds(canonicalUrl: string) {
  const siteRoot = `${SEO_CONFIG.siteUrl}/`;
  return {
    website: `${siteRoot}#website`,
    maintainer: `${siteRoot}#maintainer`,
    page: `${canonicalUrl}#webpage`,
    application: `${canonicalUrl}#application`,
  };
}

export function createStructuredData({
  title,
  description = SEO_CONFIG.defaultDescription,
  path = '/',
  keywords = [],
  pageKind,
}: Omit<SeoHeadOptions, 'noindex' | 'type'> = {}) {
  const canonicalUrl = getCanonicalUrl(path);
  const resolvedTitle = getSeoTitle(title);
  const kind = resolveSeoPageKind(path, pageKind);
  const ids = getSchemaIds(canonicalUrl);
  const pageSchema: Record<string, unknown> = {
    '@type': kind === 'about' ? 'AboutPage' : 'WebPage',
    '@id': ids.page,
    url: canonicalUrl,
    name: resolvedTitle,
    description,
    inLanguage: SEO_CONFIG.language,
    isPartOf: { '@id': ids.website },
  };

  if (kind === 'about') {
    pageSchema.about = { '@id': ids.website };
  }

  const graph: Record<string, unknown>[] = [pageSchema];
  if (kind === 'home' || kind === 'tool' || kind === 'workspace') {
    const applicationSchema: Record<string, unknown> = {
      '@type': 'WebApplication',
      '@id': ids.application,
      name: title?.trim() || SEO_CONFIG.siteName,
      url: canonicalUrl,
      description,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript and a modern web browser.',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: 0,
      },
      creator: { '@id': ids.maintainer },
      isPartOf: { '@id': ids.website },
      inLanguage: SEO_CONFIG.language,
    };

    if (keywords.length > 0) {
      applicationSchema.keywords = keywords.join(', ');
    }

    if (kind === 'home') {
      applicationSchema.sameAs = SEO_CONFIG.repositoryUrl;
      applicationSchema.license = SEO_CONFIG.licenseUrl;
    }

    pageSchema.mainEntity = { '@id': ids.application };
    applicationSchema.mainEntityOfPage = { '@id': ids.page };
    graph.push(applicationSchema);
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

export function createSeoHead({
  title,
  description = SEO_CONFIG.defaultDescription,
  path = '/',
  keywords = [],
  noindex = false,
  type = 'website',
  pageKind,
}: SeoHeadOptions = {}): HeadObject {
  const resolvedTitle = getSeoTitle(title);
  const canonicalUrl = getCanonicalUrl(path);
  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  return {
    title: resolvedTitle,
    link: noindex
      ? []
      : [{ rel: 'canonical', href: canonicalUrl }],
    meta: [
      { name: 'description', content: description },
      ...(keywords.length > 0 ? [{ name: 'keywords', content: keywords.join(', ') }] : []),
      { name: 'robots', content: robots },
      { property: 'og:type', content: type },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:title', content: resolvedTitle },
      { property: 'og:description', content: description },
      { name: 'twitter:title', content: resolvedTitle },
      { name: 'twitter:description', content: description },
    ],
    script: noindex
      ? []
      : [{
          type: 'application/ld+json',
          children: serializeStructuredData(createStructuredData({
            title,
            description,
            path,
            keywords,
            pageKind,
          })),
        }],
  };
}
