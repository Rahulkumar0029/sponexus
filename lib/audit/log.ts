import mongoose from "mongoose";
import { NextRequest } from "next/server";

import AuditLog from "@/lib/models/AuditLog";

type AuditSeverity = "INFO" | "WARN" | "CRITICAL";
type AuditEntityType =
  | "USER"
  | "PLAN"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "COUPON"
  | "ADMIN_SESSION"
  | "SYSTEM";

type LogAuditInput = {
  actorId?: string | mongoose.Types.ObjectId | null;
  action: string;
  entityType: AuditEntityType;
  entityId?: string | mongoose.Types.ObjectId | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  severity?: AuditSeverity;
  request?: NextRequest | null;
};

function toObjectIdOrNull(
  value?: string | mongoose.Types.ObjectId | null
): mongoose.Types.ObjectId | null {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return null;
}

function getIpAddressFromRequest(request?: NextRequest | null) {
  if (!request) return null;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

function getUserAgentFromRequest(request?: NextRequest | null) {
  if (!request) return null;
  return request.headers.get("user-agent")?.trim() || null;
}

export async function logAudit(input: LogAuditInput) {
  const actorId = toObjectIdOrNull(input.actorId ?? null);
  const entityId = toObjectIdOrNull(input.entityId ?? null);

  const ipAddress =
    input.ipAddress ?? getIpAddressFromRequest(input.request ?? null);
  const userAgent =
    input.userAgent ?? getUserAgentFromRequest(input.request ?? null);

  const metadata =
    input.metadata && typeof input.metadata === "object"
      ? input.metadata
      : {};

  const auditLog = await AuditLog.create({
    actorId,
    action: input.action.trim(),
    entityType: input.entityType,
    entityId,
    metadata,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    severity: input.severity ?? "INFO",
  });

  return auditLog;
}

export async function safeLogAudit(input: LogAuditInput) {
  try {
    return await logAudit(input);
  } catch (error) {
    console.error("safeLogAudit error:", error);
    return null;
  }
}