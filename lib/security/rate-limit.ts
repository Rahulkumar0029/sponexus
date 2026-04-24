type RateLimitOptions = {
  key: string;            // unique identifier (IP / userId / route)
  limit: number;          // max requests
  windowMs: number;       // time window in ms
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const globalStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();

  const existing = globalStore.get(key);

  // Reset if expired
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;

    globalStore.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Increment count
  existing.count += 1;

  // Block if exceeded
  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}