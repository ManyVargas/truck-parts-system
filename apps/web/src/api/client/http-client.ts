/**
 * HTTP fetch wrapper stub — implemented when VITE_USE_MOCK_API=false (WM12).
 * Features must depend on repository interfaces, not this module directly.
 */
export type HttpClientOptions = RequestInit & {
  parseJson?: boolean;
};

export async function httpClient<T>(
  path: string,
  options: HttpClientOptions = {},
): Promise<T> {
  const { parseJson = true, ...init } = options;

  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${path}`);
  }

  if (!parseJson || response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';
