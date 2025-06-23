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
    requestTimeout?: number;
    retryDelay?: number;
  } = {},
): Promise<T> {
  const { maxRetries = 10, requestTimeout = 200, retryDelay = 200 } = options;
  const errorMessage = 'Timeout reached';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use Promise.race to implement timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), requestTimeout);
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      // If this was the last attempt, throw the error
      if (attempt >= maxRetries) {
        throw error;
      }

      // Wait before retrying (unless it was a timeout, then retry immediately)
      if (error instanceof Error && error.message !== errorMessage) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // This should never be reached due to the throw in the loop
  throw new Error('Max retries exceeded');
}
