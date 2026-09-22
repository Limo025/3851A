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
    readResponse,
  } = {},
) {
  const controller = new AbortControllerImpl();
  let timedOut = false;
  let rejectTimeout;
  const timeoutPromise = new Promise((_resolve, reject) => {
    rejectTimeout = reject;
  });
  const timer = setTimeoutImpl(() => {
    timedOut = true;
    controller.abort();
    rejectTimeout(new ProviderTimeoutError(provider));
  }, timeoutMs);

  try {
    const operation = (async () => {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      return typeof readResponse === 'function'
        ? await readResponse(response)
        : response;
    })();
    return await Promise.race([operation, timeoutPromise]);
  } catch (error) {
    if (timedOut || controller.signal.aborted) {
      throw new ProviderTimeoutError(provider);
    }
    throw error;
  } finally {
    clearTimeoutImpl(timer);
  }
}
