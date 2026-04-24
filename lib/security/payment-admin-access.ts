import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import PaymentAdminSession from "@/lib/models/PaymentAdminSession";

/* ===============================
   RESPONSE HELPER
=================================*/
function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function deny(message: string, status = 403) {
  return {
    ok: false as const,
    response: buildNoStoreResponse(
      { success: false, message },
      status
    ),
  };
}

/* ===============================
   MAIN ACCESS CHECK
=================================*/
export async function requirePaymentAdminAccess() {
  await connectDB();

  /* ===============================
     AUTH TOKEN
  =================================*/
  const token = cookies().get("auth-token")?.value;

  if (!token) {
    return deny("Authentication required.", 401);
  }

  const decoded = verifyAccessToken(token);

  if (!decoded?.userId) {
    return deny("Invalid or expired session.", 401);
  }

  /* ===============================
     USER FETCH
  =================================*/
  const user = await User.findById(decoded.userId).select(
    "_id email role adminRole accountStatus isDeleted"
  );

  if (!user || user.isDeleted) {
    return deny("User not found.", 404);
  }

  if (
    user.accountStatus === "DISABLED" ||
    user.accountStatus === "SUSPENDED"
  ) {
    return deny("Account access restricted.", 403);
  }

  /* ===============================
     SUPER ADMIN CHECK
  =================================*/
  if (user.adminRole !== "SUPER_ADMIN") {
    return deny("Only super admin can access payment controls.", 403);
  }

  /* ===============================
     STEP-UP SESSION CHECK
  =================================*/
  const session = await PaymentAdminSession.findOne({
    adminId: user._id,
    isActive: true,
  }).sort({ createdAt: -1 });

  if (!session) {
    return deny("Payment admin session required.", 403);
  }

  const now = new Date();

  if (!session.sessionExpiresAt || new Date(session.sessionExpiresAt) <= now) {
    session.isActive = false;
    session.lastUsedAt = now;
    await session.save();

    return deny("Payment admin session expired. Re-verify.", 403);
  }

  /* ===============================
     UPDATE LAST USED
  =================================*/
  session.lastUsedAt = now;
  await session.save();

  return {
    ok: true as const,
    adminUser: user,
    paymentAccessSession: session,
  };
}