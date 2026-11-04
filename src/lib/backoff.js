// Retry schedule from the offline-first spec: 30s, 1m, 2m, 5m, 10m, 30m, then every 30m, with jitter.
export const RETRY_SCHEDULE_MS = [30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000];

/** @param attempt number of failed attempts so far (1-based). @param rand injectable for tests. */
export function nextDelayMs(attempt, rand = Math.random) {
  const base = RETRY_SCHEDULE_MS[Math.min(Math.max(attempt, 1), RETRY_SCHEDULE_MS.length) - 1];
  const jitter = base * 0.2 * (rand() * 2 - 1); // +-20%
  return Math.round(base + jitter);
}

/** Honour a server Retry-After (seconds) if it is longer than our own schedule. */
export function delayWithRetryAfter(attempt, retryAfterSec, rand = Math.random) {
  const own = nextDelayMs(attempt, rand);
  const server = Number(retryAfterSec) > 0 ? Number(retryAfterSec) * 1000 : 0;
  return Math.max(own, server);
}
