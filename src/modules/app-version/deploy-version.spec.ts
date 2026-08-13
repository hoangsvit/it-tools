import { describe, expect, it, vi } from 'vitest';

import {
  clearCompletedDeployUpdateMarker,
  createDeployUpdateUrl,
  createDeployVersionChecker,
  hasAttemptedDeployUpdate,
  shouldCheckDeployVersion,
} from './deploy-version';

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

  const onVersionMismatch = vi.fn();
  const fetchVersion = vi.fn().mockResolvedValue(createResponse(serverVersion, responseOk));

  const checkDeployVersion = createDeployVersionChecker({
    currentVersion,
    versionManifestUrl: '/version.json',
    origin: 'https://tools.eplus.dev',
    isOnline: () => online,
    fetchVersion,
    onVersionMismatch,
    now: () => 1234567890,
  });

  return {
    checkDeployVersion,
    fetchVersion,
    onVersionMismatch,
  };
}

describe('deploy version checker', () => {
  it('notifies a legacy visitor that has no embedded deploy version', async () => {
    const { checkDeployVersion, onVersionMismatch } = createChecker({
      currentVersion: undefined,
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(onVersionMismatch).toHaveBeenCalledOnce();
    expect(onVersionMismatch).toHaveBeenCalledWith({
      currentVersion: undefined,
      serverVersion: 'deploy-v2',
    });
  });

  it('does nothing for a new visitor already running the latest deploy', async () => {
    const { checkDeployVersion, onVersionMismatch } = createChecker({
      currentVersion: 'deploy-v2',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(onVersionMismatch).not.toHaveBeenCalled();
  });

  it('notifies a returning visitor when the server has a newer deploy', async () => {
    const { checkDeployVersion, onVersionMismatch } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();

    expect(onVersionMismatch).toHaveBeenCalledOnce();
    expect(onVersionMismatch).toHaveBeenCalledWith({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
    });
  });

  it('ignores a manifest that does not contain a valid version', async () => {
    const { checkDeployVersion, onVersionMismatch } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: undefined,
    });

    await checkDeployVersion();

    expect(onVersionMismatch).not.toHaveBeenCalled();
  });

  it('does not fetch the version manifest while offline', async () => {
    const { checkDeployVersion, fetchVersion, onVersionMismatch } = createChecker({
      online: false,
    });

    await checkDeployVersion();

    expect(fetchVersion).not.toHaveBeenCalled();
    expect(onVersionMismatch).not.toHaveBeenCalled();
  });

  it('ignores a failed version manifest response', async () => {
    const { checkDeployVersion, onVersionMismatch } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
      responseOk: false,
    });

    await checkDeployVersion();

    expect(onVersionMismatch).not.toHaveBeenCalled();
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

  it('deduplicates overlapping version checks and mismatch notifications', async () => {
    let resolveResponse!: (value: ReturnType<typeof createResponse>) => void;
    const pendingResponse = new Promise<ReturnType<typeof createResponse>>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchVersion = vi.fn().mockReturnValue(pendingResponse);
    const onVersionMismatch = vi.fn();

    const checkDeployVersion = createDeployVersionChecker({
      currentVersion: 'deploy-v1',
      versionManifestUrl: '/version.json',
      origin: 'https://tools.eplus.dev',
      isOnline: () => true,
      fetchVersion,
      onVersionMismatch,
      now: () => 1234567890,
    });

    const firstCheck = checkDeployVersion();
    const secondCheck = checkDeployVersion();
    resolveResponse(createResponse('deploy-v2'));
    await Promise.all([firstCheck, secondCheck]);

    expect(fetchVersion).toHaveBeenCalledOnce();
    expect(onVersionMismatch).toHaveBeenCalledOnce();
  });

  it('does not notify again on pageshow after the mismatch was already announced', async () => {
    const { checkDeployVersion, fetchVersion, onVersionMismatch } = createChecker({
      currentVersion: 'deploy-v1',
      serverVersion: 'deploy-v2',
    });

    await checkDeployVersion();
    await checkDeployVersion();

    expect(fetchVersion).toHaveBeenCalledOnce();
    expect(onVersionMismatch).toHaveBeenCalledOnce();
  });
});

describe('deploy update navigation guards', () => {
  it('skips deploy polling on local preview hosts used by Playwright', () => {
    expect(shouldCheckDeployVersion('localhost')).toBe(false);
    expect(shouldCheckDeployVersion('127.0.0.1')).toBe(false);
    expect(shouldCheckDeployVersion('[::1]')).toBe(false);
    expect(shouldCheckDeployVersion('tools.eplus.dev')).toBe(true);
  });

  it('adds the target deploy and a fresh navigation nonce without losing user state in the URL', () => {
    expect(createDeployUpdateUrl(
      'https://tools.eplus.dev/vietqr-bank-generator?bank=970436#qr',
      'deploy-v2',
      1234567890,
    )).toBe('https://tools.eplus.dev/vietqr-bank-generator?bank=970436&__eplus_update=deploy-v2&__eplus_reload=1234567890#qr');
  });

  it('detects when the browser already attempted the same deploy', () => {
    expect(hasAttemptedDeployUpdate(
      'https://tools.eplus.dev/?__eplus_update=deploy-v2&__eplus_reload=1',
      'deploy-v2',
    )).toBe(true);
    expect(hasAttemptedDeployUpdate(
      'https://tools.eplus.dev/?__eplus_update=deploy-v1&__eplus_reload=1',
      'deploy-v2',
    )).toBe(false);
  });

  it('cleans successful deploy markers while preserving the tool route, query and hash', () => {
    expect(clearCompletedDeployUpdateMarker(
      'https://tools.eplus.dev/vietqr-bank-generator?bank=970436&__eplus_update=deploy-v2&__eplus_reload=1234567890#qr',
      'deploy-v2',
    )).toBe('/vietqr-bank-generator?bank=970436#qr');

    expect(clearCompletedDeployUpdateMarker(
      'https://tools.eplus.dev/?__eplus_update=deploy-v1&__eplus_reload=1234567890',
      'deploy-v2',
    )).toBeUndefined();
  });
});
