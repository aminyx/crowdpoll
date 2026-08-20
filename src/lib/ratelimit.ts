/**
 * Small in-memory token bucket for write endpoints, keyed by
 * "<action>:<audience/session id>". Per-instance by design (same trade-off
 * as the SSE bus). Deliberately dependency-free and unit-tested.
 */

type Bucket = { tokens: number; last: number };

const globalRl = globalThis as unknown as {
  __crowdpollRl?: Map<string, Bucket>;
};

const buckets = (globalRl.__crowdpollRl ??= new Map<string, Bucket>());

export interface LimitRule {
  /** Sustained tokens per minute. */
  perMinute: number;
  /** Extra burst capacity above the sustained rate. */
  burst: number;
}

export const RULES = {
  "question:create": { perMinute: 4, burst: 2 },
  "question:vote": { perMinute: 30, burst: 10 },
  "poll:vote": { perMinute: 10, burst: 5 },
  "event:create": { perMinute: 6, burst: 2 },
} satisfies Record<string, LimitRule>;

export type Action = keyof typeof RULES;

export function allow(
  action: Action,
  key: string,
  now: number = Date.now(),
): boolean {
  const rule = RULES[action];
  const capacity = rule.perMinute + rule.burst;
  const refillPerMs = rule.perMinute / 60_000;

  const id = `${action}:${key}`;
  const bucket = buckets.get(id) ?? { tokens: capacity, last: now };
  bucket.tokens = Math.min(capacity, bucket.tokens + (now - bucket.last) * refillPerMs);
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(id, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(id, bucket);

  if (buckets.size > 50_000) {
    evictStale(now);
  }
  return true;
}

function evictStale(now: number): void {
  for (const [id, bucket] of buckets) {
    if (now - bucket.last > 10 * 60_000) buckets.delete(id);
  }
}

/** Test hook. */
export function resetRateLimiter(): void {
  buckets.clear();
}
