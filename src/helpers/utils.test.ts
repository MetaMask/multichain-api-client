import { describe, expect, it } from 'vitest';
import { withRetry } from './utils';

/**
 * Mock function that returns a promise that resolves only when called again after a delay
 * This function mocks MetaMask Multichain API wallet_getSession method, where early calls may never resolve
 *
 * @returns A promise that resolves after a delay
 */
function mockMultichainApiRequest() {
  const startTime = Date.now();

  // Delay for the first call to resolve
  const successThresholdDelay = 300;

  return async () => {
    const callTime = Date.now();
    if (callTime - startTime < successThresholdDelay) {
      // Promise that never resolves
      await new Promise(() => {});
    }
    return 'success';
  };
}

function mockThrowingFn() {
  const startTime = Date.now();

  // Delay for the first call to resolve
  const successThresholdDelay = 300;

  return async () => {
    const callTime = Date.now();
    if (callTime - startTime < successThresholdDelay) {
      throw new Error('error');
    }
    return 'success';
  };
}

describe('utils', () => {
  describe('withRetry', () => {
    it('should retry a function until it succeeds', async () => {
      const result = await withRetry(mockMultichainApiRequest(), { maxRetries: 4, requestTimeout: 100 });
      expect(result).toBe('success');
    });

    it('should retry a function that never resolves until it succeeds', async () => {
      expect(
        async () => await withRetry(mockMultichainApiRequest(), { maxRetries: 2, requestTimeout: 100 }),
      ).rejects.toThrow('Timeout reached');
    });

    it('should retry a throwing function until it succeeds', async () => {
      const result = await withRetry(mockThrowingFn(), { maxRetries: 4, requestTimeout: 100 });
      expect(result).toBe('success');
    });

    it('should retry a throwing function until it succeeds', async () => {
      expect(async () => await withRetry(mockThrowingFn(), { maxRetries: 2, requestTimeout: 100 })).rejects.toThrow(
        'error',
      );
    });
  });
});
