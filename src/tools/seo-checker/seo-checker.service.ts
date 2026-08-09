export type SeoAuditLevel = 'error' | 'warning' | 'passed' | 'info';

export interface SeoAuditItem {
  level: SeoAuditLevel
  category: string
  message: string
}

function metaContent(document: Document, selector: string) {
  return document.querySelector<HTMLMetaElement>(selector)?.content.trim() ?? '';
}

export function auditSeo(html: string): SeoAuditItem[] {
  const items: SeoAuditItem[] = [];
  if (!html.trim()) {
    return items;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const title = document.querySelector('title')?.textContent?.trim() ?? '';
  const description = metaContent(document, 'meta[name="description"]');
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? '';
  const robots = metaContent(document, 'meta[name="robots"]');
  const viewport = metaContent(document, 'meta[name="viewport"]');
  const h1Count = document.querySelectorAll('h1').length;
  const images = [...document.querySelectorAll('img')];
  const missingAlt = images.filter(image => !image.hasAttribute('alt')).length;
  const jsonLdCount = document.querySelectorAll('script[type="application/ld+json"]').length;
  const ogTitle = metaContent(document, 'meta[property="og:title"]');
  const ogDescription = metaContent(document, 'meta[property="og:description"]');
  const ogImage = metaContent(document, 'meta[property="og:image"]');
  const twitterCard = metaContent(document, 'meta[name="twitter:card"]');

  if (!title) {
    items.push({ level: 'error', category: 'Metadata', message: 'Missing <title>.' });
  }
  else if (title.length < 20 || title.length > 65) {
    items.push({ level: 'warning', category: 'Metadata', message: `Title length is ${title.length} characters; review for search snippet readability.` });
  }
  else {
    items.push({ level: 'passed', category: 'Metadata', message: `Title is present (${title.length} characters).` });
  }

  if (!description) {
    items.push({ level: 'warning', category: 'Metadata', message: 'Missing meta description.' });
  }
  else if (description.length < 70 || description.length > 170) {
    items.push({ level: 'warning', category: 'Metadata', message: `Meta description length is ${description.length} characters.` });
  }
  else {
    items.push({ level: 'passed', category: 'Metadata', message: 'Meta description is present.' });
  }

  if (!canonical) {
    items.push({ level: 'warning', category: 'Indexing', message: 'Missing canonical link.' });
  }
  else {
    items.push({ level: 'passed', category: 'Indexing', message: 'Canonical link is present.' });
  }

  if (/noindex/i.test(robots)) {
    items.push({ level: 'warning', category: 'Indexing', message: 'robots meta contains noindex.' });
  }
  else {
    items.push({ level: 'passed', category: 'Indexing', message: robots ? `robots meta: ${robots}` : 'No page-level noindex directive detected.' });
  }

  if (!viewport) {
    items.push({ level: 'warning', category: 'Mobile', message: 'Missing viewport meta tag.' });
  }
  else {
    items.push({ level: 'passed', category: 'Mobile', message: 'Viewport meta tag is present.' });
  }

  if (h1Count === 0) {
    items.push({ level: 'error', category: 'Content', message: 'No H1 heading found.' });
  }
  else if (h1Count > 1) {
    items.push({ level: 'info', category: 'Content', message: `Found ${h1Count} H1 headings; verify the hierarchy is intentional.` });
  }
  else {
    items.push({ level: 'passed', category: 'Content', message: 'One H1 heading found.' });
  }

  if (missingAlt) {
    items.push({ level: 'warning', category: 'Images', message: `${missingAlt} of ${images.length} images are missing an alt attribute.` });
  }
  else if (images.length) {
    items.push({ level: 'passed', category: 'Images', message: 'All images include an alt attribute.' });
  }

  if (ogTitle && ogDescription && ogImage) {
    items.push({ level: 'passed', category: 'Social', message: 'Core Open Graph metadata is present.' });
  }
  else {
    items.push({ level: 'warning', category: 'Social', message: 'Open Graph metadata is incomplete; check og:title, og:description and og:image.' });
  }

  if (twitterCard) {
    items.push({ level: 'passed', category: 'Social', message: `Twitter card configured as ${twitterCard}.` });
  }
  else {
    items.push({ level: 'info', category: 'Social', message: 'No twitter:card metadata found.' });
  }

  if (jsonLdCount) {
    items.push({ level: 'passed', category: 'Structured data', message: `Found ${jsonLdCount} JSON-LD block${jsonLdCount === 1 ? '' : 's'}.` });
  }
  else {
    items.push({ level: 'info', category: 'Structured data', message: 'No JSON-LD structured data found.' });
  }

  const duplicateDescriptions = document.querySelectorAll('meta[name="description"]').length;
  if (duplicateDescriptions > 1) {
    items.push({ level: 'warning', category: 'Metadata', message: `Found ${duplicateDescriptions} meta description tags.` });
  }

  const duplicateCanonicals = document.querySelectorAll('link[rel="canonical"]').length;
  if (duplicateCanonicals > 1) {
    items.push({ level: 'warning', category: 'Indexing', message: `Found ${duplicateCanonicals} canonical links.` });
  }

  return items;
}
