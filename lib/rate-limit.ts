/**
 * In-memory rate limiter (Vercel / MVP safe)
 * NOTE: Not suitable for multi-instance scaling (use Redis later)
 */

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  expiresAt: number;
};

const store = new Map<string, RateLimitRecord>();

// 🧹 cleanup interval to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.expiresAt) {
      store.delete(key);
    }
  }
}, 60 * 1000); // every 1 min

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
) {
  const now = Date.now();

  if (!key) {
    return {
      success: false,
      remaining: 0,
      reset: now + windowMs,
    };
  }

  const existing = store.get(key);

  if (!existing || now > existing.expiresAt) {
    store.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });

    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: existing.expiresAt,
    };
  }

  existing.count += 1;

  return {
    success: true,
    remaining: limit - existing.count,
    reset: existing.expiresAt,
  };
}