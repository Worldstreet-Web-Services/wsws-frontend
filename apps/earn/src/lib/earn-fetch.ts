import { buildEarnBackendUrl, mapEarnApiUrlToProxy, unwrapEarnBackendResponse } from './earn-backend';

export async function fetchEarnJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(mapEarnApiUrlToProxy(input), init);
  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : 'Earn request failed';
    throw new Error(message);
  }

  return unwrapEarnBackendResponse<T>(payload);
}

export async function fetchEarnServerJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(buildEarnBackendUrl(input), {
    cache: 'no-store',
    ...init,
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : 'Earn backend request failed';
    throw new Error(message);
  }

  return unwrapEarnBackendResponse<T>(payload);
}

