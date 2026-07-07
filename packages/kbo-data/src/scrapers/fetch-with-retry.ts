import { SCRAPER_RATE_LIMIT_DEFAULT_MS } from '@moneyball/shared';
import { sleep } from './fancy-stats';

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: SCRAPER_RATE_LIMIT_DEFAULT_MS, // 2000ms
  maxDelayMs: 10000,
  retryOn: [429, 502, 503, 504],
};

// Transient HTTP error retry wrapper. Returns Response on success or exhaustion.
// Throws on network-level failure after all attempts.
export async function fetchWithRetry(
  url: string | URL,
  options?: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (config.retryOn.includes(res.status) && attempt < config.maxAttempts) {
        const delay = Math.min(config.baseDelayMs * attempt, config.maxDelayMs);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < config.maxAttempts) {
        const delay = Math.min(config.baseDelayMs * attempt, config.maxDelayMs);
        await sleep(delay);
      }
    }
  }
  throw lastError ?? new Error('fetchWithRetry: max attempts exceeded');
}
