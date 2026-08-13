export interface VersionManifestResponse {
  ok: boolean
  json: () => Promise<unknown>
}

export interface DeployVersionMismatch {
  currentVersion?: string
  serverVersion: string
}

export const DEPLOY_UPDATE_EVENT = 'it-tools:deploy-update-available';

export interface DeployVersionCheckerOptions {
  currentVersion?: string
  versionManifestUrl: string
  origin: string
  isOnline: () => boolean
  fetchVersion: (url: URL, init: RequestInit) => Promise<VersionManifestResponse>
  onVersionMismatch: (versions: DeployVersionMismatch) => void
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
  onVersionMismatch,
  now = Date.now,
}: DeployVersionCheckerOptions) {
  let versionCheckRunning = false;
  let versionMismatchNotified = false;

  return async function checkDeployVersion() {
    if (versionCheckRunning || versionMismatchNotified || !isOnline()) {
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

      // Let the UI explain the update and show a short countdown instead of
      // surprising the user with an immediate reload while they are working.
      versionMismatchNotified = true;
      onVersionMismatch({ currentVersion, serverVersion });
    }
    catch {
      // Keep the current app usable if the version endpoint is temporarily unavailable.
    }
    finally {
      versionCheckRunning = false;
    }
  };
}
