type RateLimitRule = {
  windowMs: number;
  limit: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  limited: boolean;
  retryAfter: number;
  remaining: number;
};

const buckets = new Map<string, RateLimitBucket>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanupAt = 0;

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(key: string, rule: RateLimitRule, options: { increment?: boolean } = {}): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);
  const increment = options.increment !== false;
  const current = buckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + rule.windowMs };
  const nextCount = increment ? bucket.count + 1 : bucket.count;
  const limited = nextCount > rule.limit;

  if (increment && !limited) {
    bucket.count = nextCount;
    buckets.set(key, bucket);
  } else if (!current || current.resetAt <= now) {
    buckets.set(key, bucket);
  }

  return {
    limited,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    remaining: Math.max(0, rule.limit - bucket.count)
  };
}

export function checkRateLimits(keys: string[], rules: RateLimitRule[]): RateLimitResult {
  let result: RateLimitResult = { limited: false, retryAfter: 0, remaining: Number.POSITIVE_INFINITY };

  for (const key of keys) {
    for (const rule of rules) {
      const current = checkRateLimit(`${key}:${rule.windowMs}:${rule.limit}`, rule);
      if (current.limited) return current;
      result = current.remaining < result.remaining ? current : result;
    }
  }

  return result;
}

export function peekRateLimit(key: string, rule: RateLimitRule) {
  return checkRateLimit(`${key}:${rule.windowMs}:${rule.limit}`, rule, { increment: false });
}

export function consumeRateLimit(key: string, rule: RateLimitRule) {
  return checkRateLimit(`${key}:${rule.windowMs}:${rule.limit}`, rule);
}

export function clearRateLimit(prefix: string) {
  for (const key of buckets.keys()) {
    if (key.startsWith(prefix)) buckets.delete(key);
  }
}
