export interface VersionManifestResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

export interface ServiceWorkerRegistrationLike {
  update: () => Promise<unknown>;
}

export interface DeployVersionCheckerOptions {
  currentVersion?: string;
  versionManifestUrl: string;
  origin: string;
  baseUrl: string;
  isOnline: () => boolean;
  fetchVersion: (url: URL, init: RequestInit) => Promise<VersionManifestResponse>;
  hasServiceWorker: () => boolean;
  getRegistration: (scope: string) => Promise<ServiceWorkerRegistrationLike | undefined>;
  reload: () => void;
  now?: () => number;
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
  baseUrl,
  isOnline,
  fetchVersion,
  hasServiceWorker,
  getRegistration,
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

      // A legacy visitor may have no deploy version embedded in the running bundle.
      // Any valid server version is therefore considered newer and triggers recovery.
      if (!hasServiceWorker()) {
        reload();
        return;
      }

      const registration = await getRegistration(baseUrl);
      if (!registration) {
        reload();
        return;
      }

      await registration.update();
    }
    catch {
      // Keep the current app usable if the version endpoint is temporarily unavailable.
    }
    finally {
      versionCheckRunning = false;
    }
  };
}
