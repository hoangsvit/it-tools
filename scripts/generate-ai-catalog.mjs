import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://tools.eplus.dev';
const REPO_URL = 'https://github.com/hoangsvit/it-tools';
const root = fileURLToPath(new URL('..', import.meta.url));
const toolsDir = join(root, 'src', 'tools');
const publicDir = join(root, 'public');

function titleFromSlug(slug) {
  return slug.split('-').map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}

function getLiteral(source, key) {
  return source.match(new RegExp(`\\b${key}:\\s*['\"\\x60]([^'\"\\x60]+)['\"\\x60]`))?.[1] ?? null;
}

function getTranslateKey(source, key) {
  return source.match(new RegExp(`\\b${key}:\\s*translate\\(['\"]([^'\"]+)['\"]\\)`))?.[1] ?? null;
}

function getKeywords(source) {
  const block = source.match(/\bkeywords:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
  return [...block.matchAll(/['\"]([^'\"]+)['\"]/g)].map(match => match[1]);
}

const tools = readdirSync(toolsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .flatMap((entry) => {
    try {
      const source = readFileSync(join(toolsDir, entry.name, 'index.ts'), 'utf8');
      const path = getLiteral(source, 'path');
      if (!path) {
        return [];
      }

      return [{
        id: entry.name,
        name: getLiteral(source, 'name') ?? titleFromSlug(entry.name),
        path,
        url: new URL(path, `${SITE_URL}/`).toString(),
        description: getLiteral(source, 'description'),
        nameI18nKey: getTranslateKey(source, 'name'),
        descriptionI18nKey: getTranslateKey(source, 'description'),
        keywords: getKeywords(source),
        source: `${REPO_URL}/tree/netlify/src/tools/${entry.name}`,
      }];
    }
    catch {
      return [];
    }
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const catalog = {
  schemaVersion: 1,
  name: 'ePlus.DEV IT Tools',
  canonicalUrl: SITE_URL,
  repository: REPO_URL,
  license: 'GNU GPLv3',
  llms: `${SITE_URL}/llms.txt`,
  llmsFull: `${SITE_URL}/llms-full.txt`,
  tools,
};

const fullIndex = `# ePlus.DEV IT Tools — Full Tool Index\n\n> Canonical companion index. Total tools: ${tools.length}.\n\n${tools.map(tool => `## ${tool.name}\n\n- URL: ${tool.url}\n- Path: ${tool.path}\n- Keywords: ${tool.keywords.join(', ') || 'none'}\n`).join('\n')}`;

writeFileSync(join(publicDir, 'tools.json'), `${JSON.stringify(catalog, null, 2)}\n`);
writeFileSync(join(publicDir, 'llms-full.txt'), fullIndex);
console.log(`Generated AI catalog for ${tools.length} tools`);
