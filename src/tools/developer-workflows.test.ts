import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { developerWorkflows } from './developer-workflows';

function collectRegisteredToolPaths() {
  const toolsDir = fileURLToPath(new URL('.', import.meta.url));

  return new Set(
    readdirSync(toolsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .flatMap((entry) => {
        const indexPath = join(toolsDir, entry.name, 'index.ts');
        try {
          const source = readFileSync(indexPath, 'utf8');
          const match = source.match(/\bpath:\s*['"`]([^'"`]+)['"`]/);
          return match?.[1] ? [match[1]] : [];
        }
        catch {
          return [];
        }
      }),
  );
}

describe('developer workflows', () => {
  it('only references registered tool routes', () => {
    const registeredPaths = collectRegisteredToolPaths();

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
