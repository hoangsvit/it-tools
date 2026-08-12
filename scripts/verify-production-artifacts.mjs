import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function readRequired(path) {
  try {
    return await readFile(path, 'utf8');
  }
  catch (error) {
    throw new Error(`Missing required production artifact: ${path}`, { cause: error });
  }
}

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJavaScriptFiles(path));
    }
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path);
    }
  }

  return files;
}

function requireNoStoreHeader(netlifyConfig, path) {
  const blocks = netlifyConfig.split('[[headers]]').slice(1);
  const block = blocks.find(candidate => candidate.includes(`for = "${path}"`));

  if (!block || !block.includes('Cache-Control = "no-cache, no-store, must-revalidate"')) {
    throw new Error(`${path} must be served with no-cache, no-store, must-revalidate on Netlify`);
  }
}

const [
  versionText,
  cleanupWorker,
  cleanupWorkerSource,
  generatedWorker,
  indexHtml,
  manifestText,
  netlifyConfig,
] = await Promise.all([
  readRequired('dist/version.json'),
  readRequired('dist/sw.js'),
  readRequired('public/sw.js'),
  readRequired('dist/service-worker.js'),
  readRequired('dist/index.html'),
  readRequired('dist/manifest.webmanifest'),
  readRequired('netlify.toml'),
]);

let versionManifest;
try {
  versionManifest = JSON.parse(versionText);
}
catch (error) {
  throw new Error('dist/version.json must contain valid JSON', { cause: error });
}

if (typeof versionManifest.version !== 'string' || versionManifest.version.length === 0) {
  throw new Error('dist/version.json must contain a non-empty version');
}

const expectedVersion = process.env.DEPLOY_ID
  ?? process.env.BUILD_ID
  ?? process.env.COMMIT_REF;
if (expectedVersion && versionManifest.version !== expectedVersion) {
  throw new Error(`dist/version.json version mismatch: expected ${expectedVersion}, got ${versionManifest.version}`);
}

if (process.env.COMMIT_REF && versionManifest.commit !== process.env.COMMIT_REF) {
  throw new Error(`dist/version.json commit mismatch: expected ${process.env.COMMIT_REF}, got ${versionManifest.commit}`);
}

if (typeof versionManifest.builtAt !== 'string' || Number.isNaN(Date.parse(versionManifest.builtAt))) {
  throw new Error('dist/version.json must contain a valid builtAt timestamp');
}

if (process.env.NETLIFY === 'true' && !process.env.DEPLOY_ID) {
  throw new Error('Netlify production builds must expose DEPLOY_ID');
}

// The production /sw.js must be an exact copy of the cleanup worker source.
// This catches vite-plugin-pwa or any other plugin overwriting the migration worker.
if (cleanupWorker !== cleanupWorkerSource) {
  throw new Error('dist/sw.js differs from public/sw.js; the legacy cleanup worker was overwritten during build');
}

for (const requiredSnippet of [
  'Legacy Workbox cleanup worker',
  'self.skipWaiting()',
  'self.registration.unregister()',
  'caches.keys()',
  'caches.delete(',
  'self.clients.matchAll',
  'includeUncontrolled: true',
  'client.navigate(client.url)',
]) {
  if (!cleanupWorker.includes(requiredSnippet)) {
    throw new Error(`dist/sw.js is missing required cleanup behavior: ${requiredSnippet}`);
  }
}

if (!generatedWorker.includes('workbox')) {
  throw new Error('dist/service-worker.js should contain the separate generated Workbox worker');
}

if (generatedWorker === cleanupWorker) {
  throw new Error('dist/service-worker.js must never replace or duplicate dist/sw.js');
}

if (generatedWorker.includes('version.json')) {
  throw new Error('version.json must not be included in the Workbox precache');
}

let webManifest;
try {
  webManifest = JSON.parse(manifestText);
}
catch (error) {
  throw new Error('dist/manifest.webmanifest must contain valid JSON', { cause: error });
}

if (typeof webManifest.start_url !== 'string' || webManifest.start_url.length === 0) {
  throw new Error('dist/manifest.webmanifest must contain a start_url');
}

if (!indexHtml.includes('manifest.webmanifest')) {
  throw new Error('dist/index.html must reference manifest.webmanifest');
}

if (indexHtml.includes('registerSW.js') || indexHtml.includes('serviceWorker.register(')) {
  throw new Error('New visitors must not auto-register a Workbox service worker from index.html');
}

const builtJavaScriptFiles = await listJavaScriptFiles('dist/assets');
for (const path of builtJavaScriptFiles) {
  const source = await readFile(path, 'utf8');
  if (source.includes('navigator.serviceWorker.register(')
    || source.includes('serviceWorker.register(')) {
    throw new Error(`Built client bundle must not register a Workbox service worker: ${path}`);
  }
}

requireNoStoreHeader(netlifyConfig, '/sw.js');
requireNoStoreHeader(netlifyConfig, '/index.html');
requireNoStoreHeader(netlifyConfig, '/manifest.webmanifest');
requireNoStoreHeader(netlifyConfig, '/version.json');

if (!netlifyConfig.includes('for = "/assets/*"')
  || !netlifyConfig.includes('Cache-Control = "public, max-age=31536000, immutable"')) {
  throw new Error('Vite hashed assets should remain immutable on Netlify');
}

console.log([
  'Production build verification passed',
  `deploy=${versionManifest.version}`,
  `commit=${versionManifest.commit ?? 'none'}`,
  `builtAt=${versionManifest.builtAt}`,
  `clientBundles=${builtJavaScriptFiles.length}`,
].join(' | '));
