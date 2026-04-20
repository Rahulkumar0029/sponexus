import { cookies, headers } from "next/headers";
import { Types } from "mongoose";

import { connectDB } from "@/lib/db";
import User, { type IUser, type AdminRole } from "@/lib/models/User";
import AdminSession from "@/lib/models/AdminSession";
import AdminAuditLog, { type IAdminAuditLog } from "@/lib/models/AdminAuditLog";
import { hashToken } from "@/lib/auth";
import { hasAdminPermission, type AdminPermission, isAdminRole } from "@/lib/admin-permissions";

export const ADMIN_SESSION_COOKIE = "admin-session-token";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const ADMIN_STEP_UP_TTL_MS = 15 * 60 * 1000;

export interface AdminActor {
  user: IUser;
  adminRole: AdminRole;
  adminSessionId: string;
}

function getHeaderValues() {
  const headerStore = headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || "";
  const userAgent = headerStore.get("user-agent") || "";

  return { ipAddress, userAgent };
}

export async function getAdminActor(): Promise<AdminActor | null> {
  await connectDB();

  const cookieStore = cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);

  const adminSession = await AdminSession.findOne({
    sessionTokenHash: tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!adminSession) return null;

  const user = await User.findById(adminSession.userId);

  if (!user) return null;
  if (user.isDeleted) return null;
  if (user.accountStatus !== "ACTIVE") return null;
  if (!isAdminRole(user.adminRole)) return null;

  adminSession.lastActiveAt = new Date();
  await adminSession.save();

  return {
    user,
    adminRole: user.adminRole,
    adminSessionId: String(adminSession._id),
  };
}

export async function requireAdmin(): Promise<AdminActor> {
  const actor = await getAdminActor();

  if (!actor) {
    throw new Error("Admin authentication required");
  }

  return actor;
}

export async function requireAdminPermission(
  permission: AdminPermission
): Promise<AdminActor> {
  const actor = await requireAdmin();

  if (!hasAdminPermission(actor.adminRole, permission)) {
    throw new Error("You do not have permission to perform this action");
  }

  return actor;
}

export async function requireStepUpVerification(): Promise<AdminActor> {
  const actor = await requireAdmin();

  const session = await AdminSession.findById(actor.adminSessionId);

  if (!session) {
    throw new Error("Admin session not found");
  }

  const tooOld =
    !session.lastStepUpAt ||
    Date.now() - new Date(session.lastStepUpAt).getTime() > ADMIN_STEP_UP_TTL_MS;

  if (!session.isStepUpVerified || tooOld) {
    throw new Error("Step-up verification required");
  }

  return actor;
}

export async function markAdminSessionStepUpVerified(
  adminSessionId: string
): Promise<void> {
  await connectDB();

  await AdminSession.findByIdAndUpdate(adminSessionId, {
    $set: {
      isStepUpVerified: true,
      lastStepUpAt: new Date(),
      lastActiveAt: new Date(),
    },
  });
}

export async function revokeAdminSession(
  adminSessionId: string,
  reason: string = "Revoked by admin"
): Promise<void> {
  await connectDB();

  await AdminSession.findByIdAndUpdate(adminSessionId, {
    $set: {
      revokedAt: new Date(),
      revokeReason: reason,
    },
  });
}

export async function revokeAllAdminSessionsForUser(
  userId: string | Types.ObjectId,
  reason: string = "All admin sessions revoked"
): Promise<void> {
  await connectDB();

  await AdminSession.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    }
  );
}

export async function writeAdminAuditLog(params: {
  actorUserId: string | Types.ObjectId;
  actorAdminRole: string;
  action: string;
  targetType: IAdminAuditLog["targetType"];
  targetId?: string | Types.ObjectId | null;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await connectDB();

  const { ipAddress, userAgent } = getHeaderValues();

  await AdminAuditLog.create({
    actorUserId: params.actorUserId,
    actorAdminRole: params.actorAdminRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId ?? null,
    reason: params.reason ?? "",
    metadata: params.metadata ?? {},
    ipAddress,
    userAgent,
  });
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}