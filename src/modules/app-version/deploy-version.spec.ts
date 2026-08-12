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
  responseOk?: boolean
} = {}) {
  const currentVersion = 'currentVersion' in options ? options.currentVersion : 'deploy-v2';
  const serverVersion = 'serverVersion' in options ? options.serverVersion : 'deploy-v2';
  const online = options.online ?? true;
  const responseOk = options.responseOk ?? true;

  const reload = vi.fn();
  const fetchVersion = vi.fn().mockResolvedValue(createResponse(serverVersion, responseOk));

  const checkDeployVersion = createDeployVersionChecker({
    currentVersion,
    versionManifestUrl: '/version.json',
    origin: 'https://tools.eplus.dev',
    isOnline: () => online,
    fetchVersion,
    reload,
    now: () => 1234567890,
  });

  return {
    checkDeployVersion,
    fetchVersion,
    reload,
  };
}

describe('deploy version checker', () => {
  it('reloads a legacy visitor that has no embedded deploy version', async () => {
    const { checkDeployVersion, reload } = createChecker({
      currentVersion: undefined,
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing for a new visitor already running the latest deploy', async () => {
    const { checkDeployVersion, reload } = createChecker({
      currentVersion: 'deploy-v2',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads a returning visitor when the server has a newer deploy', async () => {
    const { checkDeployVersion, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('ignores a manifest that does not contain a valid version', async () => {
    const { checkDeployVersion, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: undefined,
    });

    await checkDeployVersion();

    expect(reload).not.toHaveBeenCalled();
  });

  it('does not fetch the version manifest while offline', async () => {
    const { checkDeployVersion, fetchVersion, reload } = createChecker({
      online: false,
    });

    await checkDeployVersion();

    expect(fetchVersion).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores a failed version manifest response', async () => {
    const { checkDeployVersion, reload } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
      responseOk: false,
    });

    await checkDeployVersion();

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

  it('deduplicates overlapping version checks and reloads once', async () => {
    let resolveResponse!: (value: ReturnType<typeof createResponse>) => void;
    const pendingResponse = new Promise<ReturnType<typeof createResponse>>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchVersion = vi.fn().mockReturnValue(pendingResponse);
    const reload = vi.fn();

    const checkDeployVersion = createDeployVersionChecker({
      currentVersion: 'deploy-v1',
      versionManifestUrl: '/version.json',
      origin: 'https://tools.eplus.dev',
      isOnline: () => true,
      fetchVersion,
      reload,
      now: () => 1234567890,
    });

    const firstCheck = checkDeployVersion();
    const secondCheck = checkDeployVersion();
    resolveResponse(createResponse('deploy-v2'));
    await Promise.all([firstCheck, secondCheck]);

    expect(fetchVersion).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });
});
