import { describe, expect, it } from 'vitest';
import type { WorkspaceToolCandidate } from './workspace-suggestions';
import { detectWorkspaceInput, suggestWorkspaceTools } from './workspace-suggestions';

const tools: WorkspaceToolCandidate[] = [
  {
    path: '/jwt-parser',
    name: 'JWT parser',
    description: 'Parse and decode JWT tokens',
    category: 'Web',
    keywords: ['jwt', 'parser', 'decode', 'token'],
  },
  {
    path: '/json-viewer',
    name: 'JSON viewer',
    description: 'View and format JSON data',
    category: 'Development',
    keywords: ['json', 'viewer', 'format'],
  },
  {
    path: '/json-to-yaml-converter',
    name: 'JSON to YAML',
    description: 'Convert JSON to YAML',
    category: 'Converter',
    keywords: ['json', 'yaml', 'convert'],
  },
  {
    path: '/url-parser',
    name: 'URL parser',
    description: 'Parse URL parts and query parameters',
    category: 'Web',
    keywords: ['url', 'parser', 'query'],
  },
  {
    path: '/sql-prettify',
    name: 'SQL prettify',
    description: 'Format SQL queries',
    category: 'Development',
    keywords: ['sql', 'format'],
  },
  {
    path: '/iban-validator-and-parser',
    name: 'IBAN validator and parser',
    description: 'Validate, parse and build IBAN values',
    category: 'Data',
    keywords: ['iban', 'bban', 'bank', 'validator'],
  },
  {
    path: '/swift-bic-validator',
    name: 'SWIFT / BIC validator & parser',
    description: 'Validate and parse SWIFT BIC bank routing codes',
    category: 'Data',
    keywords: ['swift', 'bic', 'bank', 'routing'],
  },
  {
    path: '/vietqr-bank-generator',
    name: 'VietQR & Vietnam bank codes',
    description: 'Search bank BIN and SWIFT codes and build VietQR links',
    category: 'Data',
    keywords: ['vietqr', 'bank', 'bin', 'swift', 'bic'],
  },
];

describe('workspace smart suggestions', () => {
  it('detects JWT input and recommends the JWT parser first', () => {
    const value = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature';

    expect(detectWorkspaceInput(value)[0]).toMatchObject({
      kind: 'jwt',
      label: 'JWT token',
    });

    expect(suggestWorkspaceTools({ value, tools })[0]).toMatchObject({
      toolPath: '/jwt-parser',
      kind: 'jwt',
    });
  });

  it('ranks JSON tools and can exclude a tool already used by the current step', () => {
    const suggestions = suggestWorkspaceTools({
      value: '{"sub":"123","roles":["admin"]}',
      tools,
      excludePaths: ['/json-viewer'],
    });

    expect(suggestions[0].toolPath).toBe('/json-to-yaml-converter');
    expect(suggestions.every(item => item.toolPath !== '/json-viewer')).toBe(true);
  });

  it('detects URLs and SQL without requiring exact tool names in the input', () => {
    expect(suggestWorkspaceTools({
      value: 'https://tools.eplus.dev/workspace?from=test',
      tools,
    })[0].toolPath).toBe('/url-parser');

    expect(suggestWorkspaceTools({
      value: 'SELECT id, email FROM users WHERE active = 1',
      tools,
    })[0].toolPath).toBe('/sql-prettify');
  });

  it('detects IBAN values even when formatted with spaces', () => {
    const value = 'GB29 NWBK 6016 1331 9268 19';
    expect(detectWorkspaceInput(value)).toContainEqual(expect.objectContaining({ kind: 'iban' }));
    expect(suggestWorkspaceTools({ value, tools })[0]).toMatchObject({
      toolPath: '/iban-validator-and-parser',
      kind: 'iban',
    });
  });

  it('detects SWIFT/BIC values and recommends the dedicated parser first', () => {
    const suggestions = suggestWorkspaceTools({
      value: 'BFTV VN VX',
      tools,
    });

    expect(suggestions[0]).toMatchObject({
      toolPath: '/swift-bic-validator',
      kind: 'bic',
    });
    expect(suggestions.some(item => item.toolPath === '/vietqr-bank-generator')).toBe(true);
  });

  it('returns no suggestion for arbitrary text instead of guessing aggressively', () => {
    expect(suggestWorkspaceTools({
      value: 'please help me think about this later',
      tools,
    })).toEqual([]);
  });
});
