import { describe, expect, it } from 'vitest';
import type { ToolWithCategory } from './tools.types';
import { findRelatedTools, scoreRelatedTool } from './tool-recommendations';

function makeTool(overrides: Partial<ToolWithCategory> = {}): ToolWithCategory {
  return {
    name: 'Tool',
    path: '/tool',
    description: 'Tool description',
    keywords: [],
    component: async () => ({} as never),
    icon: {} as never,
    isNew: false,
    category: 'Development',
    ...overrides,
  };
}

describe('tool recommendations', () => {
  it('prioritizes same-category tools with shared keywords', () => {
    const source = makeTool({ path: '/json-viewer', keywords: ['json', 'viewer'] });
    const strongMatch = makeTool({ path: '/json-minify', name: 'JSON Minify', keywords: ['json', 'minify'] });
    const categoryOnly = makeTool({ path: '/sql-prettify', name: 'SQL Prettify', keywords: ['sql'] });
    const keywordOnly = makeTool({ path: '/json-to-yaml', name: 'JSON to YAML', category: 'Converter', keywords: ['json', 'yaml'] });

    expect(scoreRelatedTool(source, strongMatch)).toBeGreaterThan(scoreRelatedTool(source, categoryOnly));
    expect(scoreRelatedTool(source, categoryOnly)).toBeGreaterThan(scoreRelatedTool(source, keywordOnly));
  });

  it('excludes the current tool and respects the limit', () => {
    const source = makeTool({ path: '/json-viewer', keywords: ['json'] });
    const tools = [
      source,
      makeTool({ path: '/a', name: 'A', keywords: ['json'] }),
      makeTool({ path: '/b', name: 'B', keywords: ['json'] }),
      makeTool({ path: '/c', name: 'C', keywords: ['json'] }),
    ];

    expect(findRelatedTools({ source, tools, limit: 2 }).map(tool => tool.path)).toEqual(['/a', '/b']);
  });
});
