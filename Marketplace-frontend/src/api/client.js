import { AuthenticationError, session } from '../auth/session.js';

function apiBaseUrl() {
  return import.meta.env?.VITE_API_URL || 'http://localhost:8000';
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function createApiClient({ fetchImpl = globalThis.fetch, sessionManager = session, baseUrl = apiBaseUrl() } = {}) {
  return async function apiFetch(path, { auth = false, headers = {}, body, ...options } = {}) {
    const requestHeaders = { ...headers };
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    if (body !== undefined && !isFormData) {
      requestHeaders['Content-Type'] ??= 'application/json';
    }

    if (auth) {
      const accessToken = await sessionManager.getAccessToken();
      if (accessToken) {
        requestHeaders.Authorization = `Bearer ${accessToken}`;
      }
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...options,
      headers: requestHeaders,
      body: body === undefined || isFormData ? body : JSON.stringify(body),
    });
    if (auth && response.status === 401) {
      throw new AuthenticationError();
    }

    const contentType = response.headers?.get?.('Content-Type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
      throw new ApiError(response.status, data?.error || 'Request failed');
    }
    return data;
  };
}

export const apiFetch = createApiClient();
