import { readFile } from 'node:fs/promises';

async function readRequired(path) {
  try {
    return await readFile(path, 'utf8');
  }
  catch (error) {
    throw new Error(`Missing required production artifact: ${path}`, { cause: error });
  }
}

const [versionText, cleanupWorker, generatedWorker, indexHtml] = await Promise.all([
  readRequired('dist/version.json'),
  readRequired('dist/sw.js'),
  readRequired('dist/service-worker.js'),
  readRequired('dist/index.html'),
]);

const versionManifest = JSON.parse(versionText);
if (typeof versionManifest.version !== 'string' || versionManifest.version.length === 0) {
  throw new Error('dist/version.json must contain a non-empty version');
}

if (!cleanupWorker.includes('Legacy Workbox cleanup worker')
  || !cleanupWorker.includes('self.registration.unregister()')) {
  throw new Error('dist/sw.js was overwritten; it must remain the legacy cleanup worker');
}

if (!generatedWorker.includes('workbox')) {
  throw new Error('dist/service-worker.js should contain the unregistered generated Workbox worker');
}

if (indexHtml.includes('registerSW.js') || indexHtml.includes('serviceWorker.register(')) {
  throw new Error('New visitors must not auto-register a Workbox service worker');
}

console.log(`Production artifacts OK: deploy ${versionManifest.version}`);
