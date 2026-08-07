import type { ToolWithCategory } from './tools.types';

function normalizeKeywords(keywords: string[]) {
  return new Set(keywords.map(keyword => keyword.trim().toLowerCase()).filter(Boolean));
}

export function scoreRelatedTool(source: ToolWithCategory, candidate: ToolWithCategory) {
  if (source.path === candidate.path) {
    return -1;
  }

  let score = source.category === candidate.category ? 4 : 0;
  const sourceKeywords = normalizeKeywords(source.keywords);

  for (const keyword of normalizeKeywords(candidate.keywords)) {
    if (sourceKeywords.has(keyword)) {
      score += 2;
    }
  }

  return score;
}

export function findRelatedTools({
  source,
  tools,
  limit = 4,
}: {
  source: ToolWithCategory
  tools: ToolWithCategory[]
  limit?: number
}) {
  return tools
    .map(tool => ({ tool, score: scoreRelatedTool(source, tool) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, limit)
    .map(({ tool }) => tool);
}
