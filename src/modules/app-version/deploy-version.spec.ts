import { describe, expect, it, vi } from 'vitest';

import { createDeployVersionChecker } from './deploy-version';

function createResponse(version?: string, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(version === undefined ? {} : { version }),
  };
}

function createChecker({
  currentVersion = 'deploy-v2',
  serverVersion = 'deploy-v2',
  online = true,
  serviceWorkerSupported = true,
  registrationExists = true,
  responseOk = true,
}: {
  currentVersion?: string;
  serverVersion?: string;
  online?: boolean;
  serviceWorkerSupported?: boolean;
  registrationExists?: boolean;
  responseOk?: boolean;
} = {}) {
  const update = vi.fn().mockResolvedValue(undefined);
  const reload = vi.fn();
  const fetchVersion = vi.fn().mockResolvedValue(createResponse(serverVersion, responseOk));
  const getRegistration = vi.fn().mockResolvedValue(registrationExists ? { update } : undefined);

  const checkDeployVersion = createDeployVersionChecker({
    currentVersion,
    versionManifestUrl: '/version.json',
    origin: 'https://tools.eplus.dev',
    baseUrl: '/',
    isOnline: () => online,
    fetchVersion,
    hasServiceWorker: () => serviceWorkerSupported,
    getRegistration,
    reload,
    now: () => 1234567890,
  });

  return {
    checkDeployVersion,
    fetchVersion,
    getRegistration,
    update,
    reload,
  };
}

describe('deploy version checker', () => {
  it('updates a legacy visitor that has no embedded deploy version', async () => {
    const { checkDeployVersion, update, reload } = createChecker({
      currentVersion: undefined,
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(update).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads a legacy visitor without a service worker registration', async () => {
    const { checkDeployVersion, update, reload } = createChecker({
      currentVersion: undefined,
      serverVersion: 'deploy-v2',
      registrationExists: false,
    });

    await checkDeployVersion();

    expect(update).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing for a new visitor already running the latest deploy', async () => {
    const { checkDeployVersion, getRegistration, update, reload } = createChecker({
      currentVersion: 'deploy-v2',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('updates a returning visitor when the server has a newer deploy', async () => {
    const { checkDeployVersion, update, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(update).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads on a version mismatch when service workers are unsupported', async () => {
    const { checkDeployVersion, getRegistration, update, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
      serviceWorkerSupported: false,
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('ignores a manifest that does not contain a valid version', async () => {
    const { checkDeployVersion, getRegistration, update, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: undefined,
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not fetch the version manifest while offline', async () => {
    const { checkDeployVersion, fetchVersion, update, reload } = createChecker({
      online: false,
    });

    await checkDeployVersion();

    expect(fetchVersion).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores a failed version manifest response', async () => {
    const { checkDeployVersion, getRegistration, update, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
      responseOk: false,
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('uses a cache-busting version request', async () => {
    const { checkDeployVersion, fetchVersion } = createChecker();

    await checkDeployVersion();

    expect(fetchVersion).toHaveBeenCalledOnce();
    const [url, init] = fetchVersion.mock.calls[0];
    expect(url.toString()).toBe('https://tools.eplus.dev/version.json?_=1234567890');
    expect(init).toMatchObject({
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
      },
    });
  });

  it('deduplicates overlapping version checks', async () => {
    let resolveResponse!: (value: ReturnType<typeof createResponse>) => void;
    const pendingResponse = new Promise<ReturnType<typeof createResponse>>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchVersion = vi.fn().mockReturnValue(pendingResponse);
    const update = vi.fn().mockResolvedValue(undefined);

    const checkDeployVersion = createDeployVersionChecker({
      currentVersion: 'deploy-v1',
      versionManifestUrl: '/version.json',
      origin: 'https://tools.eplus.dev',
      baseUrl: '/',
      isOnline: () => true,
      fetchVersion,
      hasServiceWorker: () => true,
      getRegistration: vi.fn().mockResolvedValue({ update }),
      reload: vi.fn(),
      now: () => 1234567890,
    });

    const firstCheck = checkDeployVersion();
    const secondCheck = checkDeployVersion();
    resolveResponse(createResponse('deploy-v2'));
    await Promise.all([firstCheck, secondCheck]);

    expect(fetchVersion).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });
});
