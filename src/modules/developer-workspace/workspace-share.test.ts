import { describe, expect, it } from 'vitest';
import type { DeveloperWorkspace } from './workspace.model';
import { decodeWorkspaceShare, encodeWorkspaceShare } from './workspace-share';

const workspace: DeveloperWorkspace = {
  id: 'workspace-1',
  name: 'API debugging',
  createdAt: 1,
  updatedAt: 2,
  steps: [
    {
      id: 'step-1',
      toolPath: '/jwt-parser',
      input: 'secret-token',
      output: '{"sub":"123"}',
      notes: 'Sensitive',
    },
  ],
};

describe('workspace sharing', () => {
  it('shares the recipe without sensitive step data by default', () => {
    const decoded = decodeWorkspaceShare(encodeWorkspaceShare(workspace));

    expect(decoded?.name).toBe('API debugging');
    expect(decoded?.steps[0]?.toolPath).toBe('/jwt-parser');
    expect(decoded?.steps[0]?.input).toBe('');
    expect(decoded?.steps[0]?.output).toBe('');
    expect(decoded?.steps[0]?.notes).toBe('');
  });

  it('includes step data only when explicitly requested', () => {
    const decoded = decodeWorkspaceShare(encodeWorkspaceShare(workspace, true));

    expect(decoded?.steps[0]?.input).toBe('secret-token');
    expect(decoded?.steps[0]?.output).toBe('{"sub":"123"}');
    expect(decoded?.steps[0]?.notes).toBe('Sensitive');
  });

  it('bounds imported recipe fields', () => {
    const oversizedWorkspace: DeveloperWorkspace = {
      ...workspace,
      name: 'n'.repeat(120),
      steps: [{
        ...workspace.steps[0],
        toolPath: `/${'p'.repeat(300)}`,
        input: 'i'.repeat(20_000),
        output: 'o'.repeat(20_000),
        notes: 'n'.repeat(8_000),
      }],
    };

    const decoded = decodeWorkspaceShare(encodeWorkspaceShare(oversizedWorkspace, true));

    expect(decoded?.name).toHaveLength(80);
    expect(decoded?.steps[0]?.toolPath).toHaveLength(200);
    expect(decoded?.steps[0]?.input).toHaveLength(12_000);
    expect(decoded?.steps[0]?.output).toHaveLength(12_000);
    expect(decoded?.steps[0]?.notes).toHaveLength(4_000);
  });

  it('rejects oversized encoded payloads before decoding', () => {
    expect(decodeWorkspaceShare('A'.repeat(64_001))).toBeNull();
  });

  it('rejects invalid payloads', () => {
    expect(decodeWorkspaceShare('not-a-valid-recipe')).toBeNull();
  });
});
