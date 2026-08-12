import { describe, expect, it, vi } from 'vitest';

import { createDeployVersionChecker } from './deploy-version';

function createResponse(version?: string, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(version === undefined ? {} : { version }),
  };
}

function createChecker(options: {
  currentVersion?: string
  serverVersion?: string
  online?: boolean
  serviceWorkerSupported?: boolean
  registrationExists?: boolean
  responseOk?: boolean
} = {}) {
  const currentVersion = 'currentVersion' in options ? options.currentVersion : 'deploy-v2';
  const serverVersion = 'serverVersion' in options ? options.serverVersion : 'deploy-v2';
  const online = options.online ?? true;
  const serviceWorkerSupported = options.serviceWorkerSupported ?? true;
  const registrationExists = options.registrationExists ?? true;
  const responseOk = options.responseOk ?? true;

  const update = vi.fn().mockResolvedValue(undefined);
  const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
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
    updateServiceWorker,
    reload,
    now: () => 1234567890,
  });

  return {
    checkDeployVersion,
    fetchVersion,
    getRegistration,
    update,
    updateServiceWorker,
    reload,
  };
}

describe('deploy version checker', () => {
  it('refreshes a legacy visitor that has no embedded deploy version', async () => {
    const { checkDeployVersion, updateServiceWorker, reload } = createChecker({
      currentVersion: undefined,
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(updateServiceWorker).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads a legacy visitor without a service worker registration', async () => {
    const { checkDeployVersion, updateServiceWorker, reload } = createChecker({
      currentVersion: undefined,
      serverVersion: 'deploy-v2',
      registrationExists: false,
    });

    await checkDeployVersion();

    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing for a new visitor already running the latest deploy', async () => {
    const { checkDeployVersion, getRegistration, updateServiceWorker, reload } = createChecker({
      currentVersion: 'deploy-v2',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('refreshes a returning visitor when the server has a newer deploy', async () => {
    const { checkDeployVersion, updateServiceWorker, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(updateServiceWorker).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads on a version mismatch when service workers are unsupported', async () => {
    const { checkDeployVersion, getRegistration, updateServiceWorker, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
      serviceWorkerSupported: false,
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('ignores a manifest that does not contain a valid version', async () => {
    const { checkDeployVersion, getRegistration, updateServiceWorker, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: undefined,
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not fetch the version manifest while offline', async () => {
    const { checkDeployVersion, fetchVersion, updateServiceWorker, reload } = createChecker({
      online: false,
    });

    await checkDeployVersion();

    expect(fetchVersion).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores a failed version manifest response', async () => {
    const { checkDeployVersion, getRegistration, updateServiceWorker, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
      responseOk: false,
    });

    await checkDeployVersion();

    expect(getRegistration).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
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
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);

    const checkDeployVersion = createDeployVersionChecker({
      currentVersion: 'deploy-v1',
      versionManifestUrl: '/version.json',
      origin: 'https://tools.eplus.dev',
      baseUrl: '/',
      isOnline: () => true,
      fetchVersion,
      hasServiceWorker: () => true,
      getRegistration: vi.fn().mockResolvedValue({ update: vi.fn().mockResolvedValue(undefined) }),
      updateServiceWorker,
      reload: vi.fn(),
      now: () => 1234567890,
    });

    const firstCheck = checkDeployVersion();
    const secondCheck = checkDeployVersion();
    resolveResponse(createResponse('deploy-v2'));
    await Promise.all([firstCheck, secondCheck]);

    expect(fetchVersion).toHaveBeenCalledOnce();
    expect(updateServiceWorker).toHaveBeenCalledOnce();
  });
});
