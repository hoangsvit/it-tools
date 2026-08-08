import type { LocationQueryRaw, Router } from 'vue-router';

function encodeState(value: unknown) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeState<T>(value: string): T | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }
  catch {
    return null;
  }
}

export function useShareableToolState<T extends Record<string, unknown>>({
  router,
  parameter = 'state',
}: {
  router: Router
  parameter?: string
}) {
  function readState(): T | null {
    const value = router.currentRoute.value.query[parameter];
    return typeof value === 'string' ? decodeState<T>(value) : null;
  }

  function makeShareLocation(state: T) {
    const query: LocationQueryRaw = {
      ...router.currentRoute.value.query,
      [parameter]: encodeState(state),
    };

    return router.resolve({
      path: router.currentRoute.value.path,
      query,
    }).href;
  }

  function applyStateToUrl(state: T) {
    return router.replace(makeShareLocation(state));
  }

  function clearStateFromUrl() {
    const query = { ...router.currentRoute.value.query };
    delete query[parameter];
    return router.replace({ path: router.currentRoute.value.path, query });
  }

  return {
    readState,
    makeShareLocation,
    applyStateToUrl,
    clearStateFromUrl,
  };
}
