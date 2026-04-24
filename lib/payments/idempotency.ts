import crypto from "crypto";
import IdempotencyKey from "@/lib/models/IdempotencyKey";

const IDEMPOTENCY_TTL_MS = 1000 * 60 * 10; // 10 minutes

function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function generateRequestHash(body: any) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(body))
    .digest("hex");
}

export async function handleIdempotency({
  key,
  userId,
  endpoint,
  requestHash,
}: {
  key: string;
  userId: string;
  endpoint: string;
  requestHash: string;
}) {
  const normalizedKey = key.trim();

  if (!normalizedKey) {
    throw new Error("Missing idempotency key");
  }

  const now = new Date();

  let record = await IdempotencyKey.findOne({ key: normalizedKey });

  if (record) {
    const isExpired =
      record.expiresAt && new Date(record.expiresAt).getTime() <= now.getTime();

    if (isExpired) {
      await IdempotencyKey.deleteOne({ _id: record._id });

      record = null;
    }
  }

  if (record) {
    if (String(record.userId) !== String(userId)) {
      throw new Error("Idempotency key belongs to another user");
    }

    if (record.endpoint !== endpoint) {
      throw new Error("Idempotency key endpoint mismatch");
    }

    if (record.requestHash !== requestHash) {
      throw new Error("Idempotency key conflict");
    }

    if (record.response) {
      return {
        isReplay: true as const,
        response: record.response,
        statusCode: record.statusCode || 200,
        record,
      };
    }

    return {
      isReplay: false as const,
      record,
      isLocked: Boolean(record.locked),
    };
  }

  record = await IdempotencyKey.create({
    key: normalizedKey,
    userId,
    endpoint,
    requestHash,
    locked: true,
    expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
  });

  return {
    isReplay: false as const,
    record,
    isLocked: true,
  };
}

export async function storeIdempotencyResponse({
  record,
  response,
  statusCode,
}: {
  record: any;
  response: any;
  statusCode: number;
}) {
  if (!record) return null;

  record.response = response;
  record.statusCode = statusCode;
  record.locked = false;
  record.expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

  await record.save();

  return record;
}

export async function releaseIdempotencyKey(record: any) {
  if (!record) return null;

  record.locked = false;
  await record.save();

  return record;
}