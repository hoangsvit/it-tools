import { describe, expect, it } from 'vitest';
import { auditSchema, extractJsonLd } from './schema-checker.service';

describe('schema checker', () => {
  it('extracts JSON-LD from HTML', () => {
    const html = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"ePlus"}</script>';
    const result = extractJsonLd(html);
    expect(result.parseErrors).toEqual([]);
    expect(result.blocks).toHaveLength(1);
  });

  it('reports malformed JSON-LD', () => {
    const result = auditSchema('<script type="application/ld+json">{"@type":</script>');
    expect(result.items.some(item => item.level === 'error')).toBe(true);
  });

  it('parses graph entities and warns about missing names', () => {
    const result = auditSchema(JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'WebSite', 'name': 'Tools' }, { '@type': 'Organization' }],
    }));
    expect(result.entities).toHaveLength(2);
    expect(result.items.some(item => item.message.includes('no name or headline'))).toBe(true);
  });
});
