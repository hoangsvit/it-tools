import { describe, expect, it } from 'vitest';
import { SEO_CONFIG, createSeoHead, getCanonicalUrl, getSeoTitle, normalizeSeoPath } from './seo';

function getMeta(head: ReturnType<typeof createSeoHead>, key: string) {
  const meta = (head.meta ?? []) as Array<{ name?: string; property?: string; content?: string }>;
  return meta.find(item => item.name === key || item.property === key)?.content;
}

describe('seo helpers', () => {
  it('normalizes route paths before creating canonical urls', () => {
    expect(normalizeSeoPath('/url-parser/?foo=bar#hash')).toBe('/url-parser');
    expect(normalizeSeoPath('url-parser/')).toBe('/url-parser');
    expect(normalizeSeoPath('/')).toBe('/');
    expect(getCanonicalUrl('/url-parser?foo=bar')).toBe('https://tools.eplus.dev/url-parser');
  });

  it('adds the site name to page titles only once', () => {
    expect(getSeoTitle('URL Parser')).toBe('URL Parser - IT Tools');
    expect(getSeoTitle('About - IT Tools')).toBe('About - IT Tools');
    expect(getSeoTitle()).toBe(SEO_CONFIG.defaultTitle);
  });

  it('creates canonical, Open Graph and Twitter metadata for a tool route', () => {
    const head = createSeoHead({
      title: 'URL Parser',
      description: 'Parse URLs and inspect their components.',
      path: '/url-parser?utm_source=test',
      keywords: ['url', 'parser'],
    });

    expect(head.title).toBe('URL Parser - IT Tools');
    expect(head.link).toContainEqual({ rel: 'canonical', href: 'https://tools.eplus.dev/url-parser' });
    expect(getMeta(head, 'description')).toBe('Parse URLs and inspect their components.');
    expect(getMeta(head, 'keywords')).toBe('url, parser');
    expect(getMeta(head, 'og:url')).toBe('https://tools.eplus.dev/url-parser');
    expect(getMeta(head, 'og:title')).toBe('URL Parser - IT Tools');
    expect(getMeta(head, 'twitter:creator')).toBe('@david_nguyen94');
  });

  it('marks non-indexable pages with noindex and nofollow', () => {
    const head = createSeoHead({ title: 'Not found', path: '/missing', noindex: true });

    expect(getMeta(head, 'robots')).toBe('noindex, nofollow');
  });
});
