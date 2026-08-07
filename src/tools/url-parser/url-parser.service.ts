export interface UrlQueryParam {
  key: string
  value: string
}

export function parseUrl(value: string) {
  try {
    return new URL(value);
  }
  catch {
    return undefined;
  }
}

export function getUrlQueryParams(url?: URL): UrlQueryParam[] {
  if (!url) {
    return [];
  }

  return Array.from(url.searchParams.entries()).map(([key, value]) => ({ key, value }));
}
