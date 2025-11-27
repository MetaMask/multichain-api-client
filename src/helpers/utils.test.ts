import { describe, expect, it } from 'vitest';
import { withRetry, withTimeout } from './utils';

describe('utils', () => {
  class CustomTimeoutError extends Error {}
  class CustomError extends Error {}

  describe('withRetry', () => {
    it('retries on thrown error until success', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('fail');
        }
        return 'ok';
      };
      const result = await withRetry(fn, { maxRetries: 5 });
      expect(result).toBe('ok');
      expect(attempts).toBe(3);
    });

    it('throws last error after exceeding maxRetries', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('boom');
      };
      await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow('boom');
      // maxRetries=2 => attempts 0,1,2 (3 total)
      expect(attempts).toBe(3);
    });

    it('retries only specific error class with delay', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new CustomError('Custom Error');
        }
        return 'done';
      };
      const start = Date.now();
      const result = await withRetry(fn, { maxRetries: 5, retryDelay: 20, timeoutErrorClass: CustomTimeoutError });
      const elapsed = Date.now() - start;
      expect(result).toBe('done');
      expect(attempts).toBe(3);
      // Two retries with ~20ms delay each (allow some tolerance)
      expect(elapsed).toBeGreaterThanOrEqual(30);
    });

    it('retries only TimeoutError class without delay', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new CustomTimeoutError('Custom Error');
        }
        return 'done';
      };
      const start = Date.now();
      const result = await withRetry(fn, { maxRetries: 5, retryDelay: 20, timeoutErrorClass: CustomTimeoutError });
      const elapsed = Date.now() - start;
      expect(result).toBe('done');
      expect(attempts).toBe(3);
      expect(elapsed).toBeLessThanOrEqual(20);
    });

    it('continues retrying even if non-timeout errors occur (no delay applied for them)', async () => {
      const sequenceErrors = [new Error('other'), new CustomTimeoutError('timeout'), new CustomTimeoutError('timeout')];
      let attempts = 0;
      const fn = async () => {
        if (attempts < sequenceErrors.length) {
          const err = sequenceErrors[attempts];
          attempts++;
          throw err;
        }
        attempts++;
        return 'final';
      };
      const result = await withRetry(fn, { maxRetries: 5, retryDelay: 10, timeoutErrorClass: CustomTimeoutError });
      expect(result).toBe('final');
      expect(attempts).toBe(4); // 3 fail + 1 success
    });
  });

  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const result = await withTimeout(Promise.resolve('ok'), 1000);
      expect(result).toBe('ok');
    });

    it('should reject after timeout', async () => {
      await expect(withTimeout(new Promise(() => {}), 50)).rejects.toThrow('Timeout after 50ms');
    });

    it('should propagate rejection from promise', async () => {
      await expect(withTimeout(Promise.reject(new Error('fail')), 1000)).rejects.toThrow('fail');
    });

    it('should use custom error from errorFactory', async () => {
      await expect(withTimeout(new Promise(() => {}), 10, () => new CustomTimeoutError('custom'))).rejects.toThrow(
        CustomTimeoutError,
      );
      await expect(withTimeout(new Promise(() => {}), 10, () => new CustomTimeoutError('custom'))).rejects.toThrow(
        'custom',
      );
    });

    it('should not apply timeout when timeoutMs is -1', async () => {
      const slowPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('completed'), 100);
      });
      const result = await withTimeout(slowPromise, -1);
      expect(result).toBe('completed');
    });

    it('should handle rejection when timeoutMs is -1', async () => {
      const failingPromise = Promise.reject(new Error('failed'));
      await expect(withTimeout(failingPromise, -1)).rejects.toThrow('failed');
    });
  });
});
