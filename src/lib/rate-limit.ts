import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Hard ceiling on tracked keys. Without it the limiter is itself a memory
 * exhaustion vector: an attacker rotating source IPs would add an entry per
 * request and never hit a limit.
 */
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

/**
 * Fixed-window per-key rate limit, in process memory.
 *
 * Scope, stated plainly: this is per server instance. On a platform that
 * runs several instances or scales to zero, the effective limit is higher
 * than `limit` and resets on cold start. It stops naive floods and script
 * kiddies hammering one endpoint; it is not a substitute for an edge rule.
 * For a hard guarantee, put a rate limit in front of the origin
 * (Cloudflare WAF, which this site already fronts) or back this with a
 * shared store.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

function prune(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  // Still full once expired entries are gone: drop oldest-inserted first.
  // Map iterates in insertion order, so the first key is the oldest.
  while (buckets.size >= MAX_TRACKED_KEYS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

/**
 * Best-effort client address.
 *
 * `cf-connecting-ip` is set by Cloudflare and can't be spoofed past it;
 * `x-forwarded-for`'s leftmost entry is only trustworthy because the
 * platform proxy rewrites the header. If the app is ever served without a
 * proxy in front, this becomes client-controlled and the limiter degrades
 * accordingly -- which is another reason the real limit belongs at the edge.
 */
export function getClientKey(request: Request): string {
  const cloudflare = request.headers.get("cf-connecting-ip");
  if (cloudflare) return cloudflare.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}
