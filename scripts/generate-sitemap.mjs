import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://tools.eplus.dev';
const rootDir = fileURLToPath(new URL('..', import.meta.url));
const toolsDir = join(rootDir, 'src', 'tools');
const outputPath = join(rootDir, 'public', 'sitemap.xml');

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function collectToolRoutes() {
  return readdirSync(toolsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(toolsDir, entry.name, 'index.ts'))
    .flatMap((indexPath) => {
      try {
        const source = readFileSync(indexPath, 'utf8');
        const match = source.match(/\bpath:\s*['"`]([^'"`]+)['"`]/);
        return match?.[1] ? [match[1]] : [];
      }
      catch {
        return [];
      }
    });
}

const routes = Array.from(new Set(['/', '/about', ...collectToolRoutes()])).sort();
const urls = routes
  .map((route) => {
    const location = new URL(route, `${SITE_URL}/`).toString();
    const priority = route === '/' ? '1.0' : route === '/about' ? '0.5' : '0.8';
    return `  <url>\n    <loc>${escapeXml(location)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

writeFileSync(outputPath, sitemap, 'utf8');
console.log(`Generated sitemap with ${routes.length} routes at ${outputPath}`);
