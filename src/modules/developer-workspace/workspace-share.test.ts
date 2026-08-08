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

  it('rejects invalid payloads', () => {
    expect(decodeWorkspaceShare('not-a-valid-recipe')).toBeNull();
  });
});
