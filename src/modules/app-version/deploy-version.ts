export interface VersionManifestResponse {
  ok: boolean
  json: () => Promise<unknown>
}

export interface DeployVersionMismatch {
  currentVersion?: string
  serverVersion: string
}

export const DEPLOY_UPDATE_QUERY_PARAM = '__eplus_update';
export const DEPLOY_UPDATE_RELOAD_PARAM = '__eplus_reload';

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

export function shouldCheckDeployVersion(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return !['localhost', '127.0.0.1', '::1'].includes(normalizedHostname);
}

export function createDeployUpdateUrl(currentHref: string, serverVersion: string, reloadNonce = Date.now()) {
  const url = new URL(currentHref);
  url.searchParams.set(DEPLOY_UPDATE_QUERY_PARAM, serverVersion);
  url.searchParams.set(DEPLOY_UPDATE_RELOAD_PARAM, reloadNonce.toString());
  return url.toString();
}

export function hasAttemptedDeployUpdate(currentHref: string, serverVersion: string) {
  try {
    return new URL(currentHref).searchParams.get(DEPLOY_UPDATE_QUERY_PARAM) === serverVersion;
  }
  catch {
    return false;
  }
}

export function clearCompletedDeployUpdateMarker(currentHref: string, currentVersion?: string) {
  try {
    const url = new URL(currentHref);
    if (!currentVersion || url.searchParams.get(DEPLOY_UPDATE_QUERY_PARAM) !== currentVersion) {
      return undefined;
    }

    url.searchParams.delete(DEPLOY_UPDATE_QUERY_PARAM);
    url.searchParams.delete(DEPLOY_UPDATE_RELOAD_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
  }
  catch {
    return undefined;
  }
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
