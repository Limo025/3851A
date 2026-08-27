const DEFAULT_PROVIDER_TIMEOUT_MS = 10_000;

export class ProviderTimeoutError extends Error {
  constructor(provider) {
    super(`${provider} request timed out`);
    this.name = 'ProviderTimeoutError';
    this.code = 'PROVIDER_TIMEOUT';
    this.statusCode = 504;
  }
}

export function isProviderTimeoutError(error) {
  return error?.code === 'PROVIDER_TIMEOUT';
}

export async function fetchWithTimeout(
  fetchImpl,
  url,
  options,
  {
    provider = 'Provider',
    timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
    setTimeoutImpl = setTimeout,
    clearTimeoutImpl = clearTimeout,
    AbortControllerImpl = AbortController,
  } = {},
) {
  const controller = new AbortControllerImpl();
  const timer = setTimeoutImpl(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ProviderTimeoutError(provider);
    }
    throw error;
  } finally {
    clearTimeoutImpl(timer);
  }
}
