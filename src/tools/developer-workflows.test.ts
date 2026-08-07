import { describe, expect, it } from 'vitest';
import { developerWorkflows } from './developer-workflows';

describe('developer workflows', () => {
  it('defines unique, navigable tool paths for every workflow', () => {
    for (const workflow of developerWorkflows) {
      expect(workflow.paths.length).toBeGreaterThanOrEqual(3);
      expect(new Set(workflow.paths).size).toBe(workflow.paths.length);

      for (const path of workflow.paths) {
        expect(path).toMatch(/^\/[a-z0-9-]+$/);
      }
    }
  });

  it('defines searchable metadata for every workflow', () => {
    const names = developerWorkflows.map(workflow => workflow.name);

    expect(new Set(names).size).toBe(names.length);

    for (const workflow of developerWorkflows) {
      expect(workflow.name.trim().length).toBeGreaterThan(0);
      expect(workflow.description.trim().length).toBeGreaterThan(20);
      expect(workflow.keywords.length).toBeGreaterThanOrEqual(3);
      expect(workflow.keywords.every(keyword => keyword.trim().length > 0)).toBe(true);
    }
  });
});
