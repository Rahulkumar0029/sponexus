export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import User from "@/lib/models/User";
import { verifyAccessToken } from "@/lib/auth";
import { SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function sanitizePlan(plan: any) {
  if (!plan) return null;

  return {
    _id: plan._id ? String(plan._id) : String(plan.planId || ""),
    code: plan.code ?? "",
    name: plan.name ?? "",
    role: plan.role ?? null,
    description: plan.description ?? "",
    price: plan.price ?? 0,
    currency: plan.currency ?? "INR",
    interval: plan.interval ?? "CUSTOM",
    durationInDays: plan.durationInDays ?? 0,
    extraDays: plan.extraDays ?? 0,

    postingLimitPerDay: plan.postingLimitPerDay ?? null,
    dealRequestLimitPerDay: plan.dealRequestLimitPerDay ?? null,

    canPublish: Boolean(plan.canPublish),
    canContact: Boolean(plan.canContact),
    canUseMatch: Boolean(plan.canUseMatch),
    canRevealContact: Boolean(plan.canRevealContact),

    budgetMin: plan.budgetMin ?? null,
    budgetMax: plan.budgetMax ?? null,

    isActive: typeof plan.isActive === "boolean" ? plan.isActive : true,
    isArchived: Boolean(plan.isArchived),
    isVisible: typeof plan.isVisible === "boolean" ? plan.isVisible : true,

    visibleToRoles: Array.isArray(plan.visibleToRoles)
      ? plan.visibleToRoles
      : [],
    visibleToLoggedOut: Boolean(plan.visibleToLoggedOut),

    sortOrder: typeof plan.sortOrder === "number" ? plan.sortOrder : 0,
    metadata: plan.metadata ?? {},
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
    isActive:
      typeof subscription.isActive === "boolean" ? subscription.isActive : true,

    startDate: subscription.startDate || null,
    endDate: subscription.endDate || null,
    graceEndDate: subscription.graceEndDate || null,

    activatedAt: subscription.activatedAt || null,
    expiredAt: subscription.expiredAt || null,
    cancelledAt: subscription.cancelledAt || null,

    autoRenew: Boolean(subscription.autoRenew),
    renewalCount: subscription.renewalCount || 0,
    source: subscription.source,

    baseDurationInDays: subscription.baseDurationInDays ?? null,
    extraDaysApplied: subscription.extraDaysApplied ?? 0,

    lastPaymentId: subscription.lastPaymentId
      ? String(subscription.lastPaymentId)
      : null,
    grantedByAdminId: subscription.grantedByAdminId
      ? String(subscription.grantedByAdminId)
      : null,

    couponCodeUsed: subscription.couponCodeUsed ?? null,
    couponDiscountAmount: subscription.couponDiscountAmount ?? null,

    planSnapshot: subscription.planSnapshot || null,
    createdAt: subscription.createdAt || null,
    updatedAt: subscription.updatedAt || null,
  };
}

function getRemainingDays(endDate: Date | string | null) {
  if (!endDate) return null;

  const now = new Date();
  const diff = new Date(endDate).getTime() - now.getTime();

  if (diff <= 0) return 0;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid session." },
        401
      );
    }

    const user = await User.findById(decoded.userId)
      .select("_id role adminRole accountStatus isDeleted")
      .lean();

    if (!user || user.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "User not found." },
        404
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Account restricted." },
        403
      );
    }

    if (isAdminBypass(user)) {
      return buildNoStoreResponse(
        {
          success: true,
          adminBypass: true,
          hasActiveSubscription: true,
          subscription: null,
          plan: null,
          status: "ADMIN_BYPASS",
          remainingDays: null,
          isExpiringSoon: false,
        },
        200
      );
    }

    if (user.role !== "ORGANIZER" && user.role !== "SPONSOR") {
      return buildNoStoreResponse(
        {
          success: true,
          adminBypass: false,
          hasActiveSubscription: false,
          subscription: null,
          plan: null,
          status: "INVALID_ROLE",
          remainingDays: null,
          isExpiringSoon: false,
        },
        200
      );
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      role: user.role,
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
          remainingDays: null,
          isExpiringSoon: false,
        },
        200
      );
    }

    const subscriptionIsActive =
  typeof subscription.isActive === "boolean" ? subscription.isActive : true;

const remainingDays = getRemainingDays(subscription.endDate);
const now = new Date();

const hasValidTime =
  subscription.status === SUBSCRIPTION_STATUS.GRACE
    ? Boolean(
        subscription.graceEndDate && new Date(subscription.graceEndDate) >= now
      )
    : Boolean(subscription.endDate && new Date(subscription.endDate) >= now);

if (!hasValidTime) {
  return buildNoStoreResponse(
    {
      success: true,
      adminBypass: false,
      hasActiveSubscription: false,
      subscription: sanitizeSubscription(subscription),
      plan: null,
      status: "SUBSCRIPTION_EXPIRED",
      remainingDays,
      isExpiringSoon: false,
      message: "Subscription has expired.",
    },
    200
  );
}

    if (!subscriptionIsActive) {
      return buildNoStoreResponse(
        {
          success: true,
          adminBypass: false,
          hasActiveSubscription: false,
          subscription: sanitizeSubscription(subscription),
          plan: null,
          status: "SUBSCRIPTION_INACTIVE",
          remainingDays,
          isExpiringSoon: false,
          message: "Subscription is inactive.",
        },
        200
      );
    }

    let planData = subscription.planSnapshot
      ? sanitizePlan(subscription.planSnapshot)
      : null;

    if (!planData && subscription.planId) {
      const plan = await Plan.findById(subscription.planId)
        .select(
          "_id code name role description price currency interval durationInDays extraDays postingLimitPerDay dealRequestLimitPerDay canPublish canContact canUseMatch canRevealContact budgetMin budgetMax isActive isArchived isVisible visibleToRoles visibleToLoggedOut sortOrder metadata"
        )
        .lean();

      planData = plan ? sanitizePlan(plan) : null;
    }

    return buildNoStoreResponse(
      {
        success: true,
        adminBypass: false,
        hasActiveSubscription: true,
        subscription: sanitizeSubscription(subscription),
        plan: planData,
        status: subscription.status,
        remainingDays,
        isExpiringSoon: remainingDays !== null && remainingDays <= 3,
        message:
          subscription.status === SUBSCRIPTION_STATUS.GRACE
            ? "Subscription in grace period."
            : "Subscription active.",
      },
      200
    );
  } catch (error) {
    console.error("GET /api/subscriptions/my error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch subscription." },
      500
    );
  }
}