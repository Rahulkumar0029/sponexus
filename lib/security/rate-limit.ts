import { NextRequest } from "next/server";

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

/* =========================================
   MAIN RATE LIMIT FUNCTION
========================================= */
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

/* =========================================
   HELPER: GET USER IP (VERY IMPORTANT)
========================================= */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown-ip"
  );
}

/* =========================================
   HELPER: BUILD SAFE RATE LIMIT KEY
========================================= */
export function buildRateLimitKey(params: {
  request: NextRequest;
  route: string;
  userId?: string;
}) {
  const ip = getClientIp(params.request);

  if (params.userId) {
    return `user:${params.userId}:${params.route}`;
  }

  return `ip:${ip}:${params.route}`;
}

/* =========================================
   MEMORY CLEANUP (PREVENT MEMORY LEAK)
========================================= */
setInterval(() => {
  const now = Date.now();

  for (const [key, value] of globalStore.entries()) {
    if (value.resetAt < now) {
      globalStore.delete(key);
    }
  }
}, 60 * 1000); // runs every 1 min