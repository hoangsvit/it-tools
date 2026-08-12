export interface VersionManifestResponse {
  ok: boolean
  json: () => Promise<unknown>
}

export interface DeployVersionCheckerOptions {
  currentVersion?: string
  versionManifestUrl: string
  origin: string
  isOnline: () => boolean
  fetchVersion: (url: URL, init: RequestInit) => Promise<VersionManifestResponse>
  reload: () => void
  now?: () => number
}

function getManifestVersion(manifest: unknown) {
  if (!manifest || typeof manifest !== 'object') {
    return undefined;
  }

  const { version } = manifest as { version?: unknown };
  return typeof version === 'string' && version.length > 0 ? version : undefined;
}

export function createDeployVersionChecker({
  currentVersion,
  versionManifestUrl,
  origin,
  isOnline,
  fetchVersion,
  reload,
  now = Date.now,
}: DeployVersionCheckerOptions) {
  let versionCheckRunning = false;

  return async function checkDeployVersion() {
    if (versionCheckRunning || !isOnline()) {
      return;
    }

    versionCheckRunning = true;

    try {
      const versionUrl = new URL(versionManifestUrl, origin);
      versionUrl.searchParams.set('_', now().toString());

      const response = await fetchVersion(versionUrl, {
        cache: 'no-store',
        headers: {
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        return;
      }

      const serverVersion = getManifestVersion(await response.json());
      if (!serverVersion || serverVersion === currentVersion) {
        return;
      }

      // HTML is served with no-store and application assets are content-hashed.
      // Reloading directly is therefore enough to move the browser to the new
      // deploy without depending on Service Worker lifecycle timing.
      reload();
    }
    catch {
      // Keep the current app usable if the version endpoint is temporarily unavailable.
    }
    finally {
      versionCheckRunning = false;
    }
  };
}
