import { describe, expect, it } from 'vitest';
import { getUrlQueryParams, parseUrl } from './url-parser.service';

describe('url-parser service', () => {
  it('parses a valid absolute url', () => {
    const url = parseUrl('https://user:pass@example.com:8080/path?q=hello%20world#section');

    expect(url?.protocol).toBe('https:');
    expect(url?.username).toBe('user');
    expect(url?.password).toBe('pass');
    expect(url?.hostname).toBe('example.com');
    expect(url?.port).toBe('8080');
    expect(url?.pathname).toBe('/path');
    expect(url?.hash).toBe('#section');
  });

  it('returns undefined for an invalid url', () => {
    expect(parseUrl('not a url')).toBeUndefined();
  });

  it('preserves duplicate query parameter keys and decodes their values', () => {
    const url = parseUrl('https://example.com/?tag=vue&tag=typescript&q=hello%20world');

    expect(getUrlQueryParams(url)).toEqual([
      { key: 'tag', value: 'vue' },
      { key: 'tag', value: 'typescript' },
      { key: 'q', value: 'hello world' },
    ]);
  });

  it('returns an empty list when no url is available', () => {
    expect(getUrlQueryParams()).toEqual([]);
  });
});
