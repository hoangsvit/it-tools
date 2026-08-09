import { describe, expect, it } from 'vitest';
import { auditSeo } from './seo-checker.service';

describe('seo checker', () => {
  it('passes core metadata for a healthy page', () => {
    const items = auditSeo('<!doctype html><html><head><title>Useful developer tools for everyday debugging</title><meta name="description" content="A practical collection of developer utilities for debugging, conversion, validation and browser-local workflows."><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="index,follow"><link rel="canonical" href="https://tools.eplus.dev/test"><meta property="og:title" content="Tools"><meta property="og:description" content="Developer tools"><meta property="og:image" content="https://tools.eplus.dev/og.png"><meta name="twitter:card" content="summary_large_image"></head><body><h1>Tools</h1><img src="x.png" alt="Example"></body></html>');
    expect(items.some(item => item.level === 'error')).toBe(false);
    expect(items.some(item => item.message === 'One H1 heading found.')).toBe(true);
  });

  it('detects critical missing SEO fields', () => {
    const items = auditSeo('<html><head></head><body><p>Hello</p></body></html>');
    expect(items.some(item => item.message.includes('Missing <title>'))).toBe(true);
    expect(items.some(item => item.message.includes('No H1'))).toBe(true);
  });

  it('detects noindex and duplicate canonical links', () => {
    const items = auditSeo('<html><head><title>Test page title that is long enough for audit</title><meta name="robots" content="noindex"><link rel="canonical" href="https://a.test"><link rel="canonical" href="https://b.test"></head><body><h1>Test</h1></body></html>');
    expect(items.some(item => item.message.includes('noindex'))).toBe(true);
    expect(items.some(item => item.message.includes('2 canonical'))).toBe(true);
  });
});
