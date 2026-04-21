import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import User from "@/lib/models/User";
import { verifyAccessToken } from "@/lib/auth";
import { SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";

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

function sanitizePlan(plan: any) {
  if (!plan) return null;

  return {
    _id: String(plan._id),
    code: plan.code,
    name: plan.name,
    role: plan.role,
    price: plan.price,
    currency: plan.currency,
    durationInDays: plan.durationInDays,
    isActive: plan.isActive,
    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
  };
}

function sanitizeSubscription(subscription: any) {
  if (!subscription) return null;

  return {
    _id: String(subscription._id),
    userId: String(subscription.userId),
    role: subscription.role,
    planId: subscription.planId ? String(subscription.planId) : null,
    status: subscription.status,
    startDate: subscription.startDate || null,
    endDate: subscription.endDate || null,
    graceEndDate: subscription.graceEndDate || null,
    autoRenew: Boolean(subscription.autoRenew),
    renewalCount: subscription.renewalCount || 0,
    source: subscription.source,
    lastPaymentId: subscription.lastPaymentId
      ? String(subscription.lastPaymentId)
      : null,
    createdAt: subscription.createdAt || null,
    updatedAt: subscription.updatedAt || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId || !decoded?.email) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid or expired session.",
        },
        401
      );
    }

    const user = await User.findById(decoded.userId)
      .select("_id email role adminRole accountStatus")
      .lean();

    if (!user) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "User not found.",
        },
        404
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Account access restricted.",
        },
        403
      );
    }

    const adminBypass = isAdminBypass(user);

    if (adminBypass) {
      return buildNoStoreResponse(
        {
          success: true,
          adminBypass: true,
          hasActiveSubscription: true,
          subscription: null,
          plan: null,
          status: "ADMIN_BYPASS",
          message: "Admin access active.",
        },
        200
      );
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      status: {
        $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE],
      },
    })
      .sort({ endDate: -1, createdAt: -1 })
      .lean();

    if (!subscription) {
      return buildNoStoreResponse(
        {
          success: true,
          adminBypass: false,
          hasActiveSubscription: false,
          subscription: null,
          plan: null,
          status: "NO_ACTIVE_SUBSCRIPTION",
          message: "No active subscription found.",
        },
        200
      );
    }

    const plan = await Plan.findById(subscription.planId)
      .select("_id code name role price currency durationInDays isActive createdAt updatedAt")
      .lean();

    return buildNoStoreResponse(
      {
        success: true,
        adminBypass: false,
        hasActiveSubscription: true,
        subscription: sanitizeSubscription(subscription),
        plan: sanitizePlan(plan),
        status: subscription.status,
        message:
          subscription.status === SUBSCRIPTION_STATUS.GRACE
            ? "Your subscription is in grace period."
            : "Your subscription is active.",
      },
      200
    );
  } catch (error) {
    console.error("GET /api/subscriptions/my error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch subscription details.",
      },
      500
    );
  }
}