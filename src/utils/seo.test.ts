import { describe, expect, it } from 'vitest';
import {
  SEO_CONFIG,
  createSeoHead,
  createStructuredData,
  getCanonicalUrl,
  getSeoTitle,
  normalizeSeoPath,
  resolveSeoPageKind,
  serializeStructuredData,
} from './seo';

function getMeta(head: ReturnType<typeof createSeoHead>, key: string) {
  const meta = (head.meta ?? []) as Array<{ name?: string; property?: string; content?: string }>;
  return meta.find(item => item.name === key || item.property === key)?.content;
}

function getJsonLd(head: ReturnType<typeof createSeoHead>) {
  const scripts = (head.script ?? []) as Array<{ type?: string; children?: string }>;
  const script = scripts.find(item => item.type === 'application/ld+json');
  return script?.children ? JSON.parse(script.children) : null;
}

function findSchema(graph: Record<string, unknown>[], type: string) {
  return graph.find(node => node['@type'] === type);
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

  it('infers the semantic page kind from public routes', () => {
    expect(resolveSeoPageKind('/')).toBe('home');
    expect(resolveSeoPageKind('/about')).toBe('about');
    expect(resolveSeoPageKind('/workspace')).toBe('workspace');
    expect(resolveSeoPageKind('/url-parser')).toBe('tool');
  });

  it('creates canonical, social metadata and WebApplication schema for tool routes', () => {
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
    expect(getMeta(head, 'twitter:title')).toBe('URL Parser - IT Tools');

    const structuredData = getJsonLd(head) as { '@graph': Record<string, unknown>[] };
    const page = findSchema(structuredData['@graph'], 'WebPage');
    const application = findSchema(structuredData['@graph'], 'WebApplication');

    expect(page).toMatchObject({
      ['@id']: 'https://tools.eplus.dev/url-parser#webpage',
      url: 'https://tools.eplus.dev/url-parser',
      name: 'URL Parser - IT Tools',
      mainEntity: { '@id': 'https://tools.eplus.dev/url-parser#application' },
    });
    expect(application).toMatchObject({
      ['@id']: 'https://tools.eplus.dev/url-parser#application',
      name: 'URL Parser',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { ['@type']: 'Offer', price: 0 },
      keywords: 'url, parser',
    });
  });

  it('creates home WebPage and WebApplication schema', () => {
    const structuredData = createStructuredData();
    const graph = structuredData['@graph'];

    expect(findSchema(graph, 'WebPage')).toMatchObject({
      ['@id']: 'https://tools.eplus.dev/#webpage',
      url: 'https://tools.eplus.dev/',
    });
    expect(findSchema(graph, 'WebApplication')).toMatchObject({
      ['@id']: 'https://tools.eplus.dev/#application',
      name: SEO_CONFIG.siteName,
      sameAs: SEO_CONFIG.repositoryUrl,
      license: SEO_CONFIG.licenseUrl,
    });
  });

  it('uses AboutPage schema without pretending About is an application', () => {
    const structuredData = createStructuredData({
      title: 'About',
      path: '/about',
      description: 'About IT Tools by ePlus.DEV.',
    });
    const graph = structuredData['@graph'];

    expect(findSchema(graph, 'AboutPage')).toMatchObject({
      ['@id']: 'https://tools.eplus.dev/about#webpage',
      url: 'https://tools.eplus.dev/about',
    });
    expect(findSchema(graph, 'WebApplication')).toBeUndefined();
  });

  it('uses WebApplication schema for Developer Workspace', () => {
    const structuredData = createStructuredData({
      title: 'Developer Workspace',
      path: '/workspace',
      description: 'Private browser-local developer workflow workspace.',
    });
    const graph = structuredData['@graph'];

    expect(findSchema(graph, 'WebApplication')).toMatchObject({
      ['@id']: 'https://tools.eplus.dev/workspace#application',
      name: 'Developer Workspace',
      applicationCategory: 'DeveloperApplication',
    });
  });

  it('marks non-indexable pages with noindex, without canonical or structured data', () => {
    const head = createSeoHead({ title: 'Not found', path: '/missing', noindex: true });

    expect(getMeta(head, 'robots')).toBe('noindex, nofollow');
    expect(head.link).toEqual([]);
    expect(head.script).toEqual([]);
  });

  it('escapes script-closing characters in JSON-LD', () => {
    const serialized = serializeStructuredData({ value: '</script><script>alert(1)</script>' });

    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual({ value: '</script><script>alert(1)</script>' });
  });
});
