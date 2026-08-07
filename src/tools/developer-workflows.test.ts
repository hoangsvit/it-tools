import { describe, expect, it } from 'vitest';
import { developerWorkflows } from './developer-workflows';
import { tools } from './index';

describe('developer workflows', () => {
  it('only references registered tool routes', () => {
    const registeredPaths = new Set(tools.map(tool => tool.path));

    for (const workflow of developerWorkflows) {
      for (const path of workflow.paths) {
        expect(registeredPaths.has(path), `${workflow.name} references missing route ${path}`).toBe(true);
      }
    }
  });

  it('uses unique tools inside each workflow', () => {
    for (const workflow of developerWorkflows) {
      expect(new Set(workflow.paths).size).toBe(workflow.paths.length);
      expect(workflow.paths.length).toBeGreaterThanOrEqual(3);
    }
  });
});
