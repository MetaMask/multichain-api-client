// chrome is a global injected by browser extensions
declare const chrome: any;

/**
 * Detects if we're in a Chrome-like environment with extension support
 */
export const isChromeRuntime = (): boolean => {
  return typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.connect === 'function';
};

/**
 * Retry a function until we get a response
 * @param fn - Function to execute
 * @param maxRetries - Max number of retries
 * @param requestTimeout - Maximum delay before aborting each request attempt
 * @param retryDelay - Delay between retries (defaults to requestTimeout) in case of error
 * @returns
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeoutErrorClass?: new (...args: any[]) => Error;
  } = {},
): Promise<T> {
  const { maxRetries = 10, retryDelay = 200, timeoutErrorClass } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // If this was the last attempt, throw the error
      if (attempt >= maxRetries) {
        throw error;
      }

      // Wait before retrying (unless it was a timeout, then retry immediately)
      if (timeoutErrorClass && typeof timeoutErrorClass === 'function' && error instanceof timeoutErrorClass) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // This should never be reached due to the throw in the loop
  throw new Error('Max retries exceeded');
}

/**
 * Returns a promise that resolves or rejects like the given promise, but fails if the timeout is exceeded.
 * @param promise - The promise to monitor
 * @param timeoutMs - Maximum duration in ms
 * @param errorFactory - Optional callback to generate a custom error on timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorFactory?: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (errorFactory) {
        reject(errorFactory());
      } else {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
