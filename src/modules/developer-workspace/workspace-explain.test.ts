import { describe, expect, it } from 'vitest';
import { explainWorkspaceInput } from './workspace-explain';

describe('workspace explain mode', () => {
  it('explains JSON shape', () => {
    const explanation = explainWorkspaceInput('{"name":"ePlus","enabled":true}');

    expect(explanation?.kind).toBe('json');
    expect(explanation?.facts).toContainEqual({ label: 'Top-level keys', value: '2' });
  });

  it('explains URL components', () => {
    const explanation = explainWorkspaceInput('https://tools.eplus.dev/path?a=1&b=2#demo');

    expect(explanation?.kind).toBe('url');
    expect(explanation?.facts).toContainEqual({ label: 'Host', value: 'tools.eplus.dev' });
    expect(explanation?.facts).toContainEqual({ label: 'Query parameters', value: '2' });
  });

  it('explains private IPv4 addresses', () => {
    const explanation = explainWorkspaceInput('192.168.1.10');

    expect(explanation?.kind).toBe('ipv4');
    expect(explanation?.facts).toContainEqual({ label: 'Scope', value: 'Private RFC1918 range' });
  });
});
