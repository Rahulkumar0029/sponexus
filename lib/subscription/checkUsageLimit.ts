import mongoose from "mongoose";
import Subscription from "@/lib/models/Subscription";
import UsageCounter from "@/lib/models/UsageCounter";
import { checkSubscriptionAccess } from "@/lib/subscription/checkAccess";
import { ACTIONS, SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";
import type { PermissionAction } from "@/lib/subscription/checkPermission";

type LimitAction = PermissionAction;

type CheckUsageLimitInput = {
  userId: string;
  role: "ORGANIZER" | "SPONSOR";
  action: LimitAction;
  amount?: number | null;
};

type PlanLimits = {
  eventPostsPerDay?: number | null;
  sponsorshipPostsPerDay?: number | null;
  dealRequestsPerDay?: number | null;
  contactRevealsPerDay?: number | null;
  matchUsesPerDay?: number | null;
  eventPostsPerMonth?: number | null;
  sponsorshipPostsPerMonth?: number | null;
  dealRequestsPerMonth?: number | null;
  contactRevealsPerMonth?: number | null;
  matchUsesPerMonth?: number | null;
  maxPostBudgetAmount?: number | null;
};

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getLimitKeys(action: LimitAction) {
  if (action === ACTIONS.PUBLISH_EVENT) {
    return {
      daily: "eventPostsPerDay",
      monthly: "eventPostsPerMonth",
      label: "event posts",
    } as const;
  }

  if (action === ACTIONS.PUBLISH_SPONSORSHIP) {
    return {
      daily: "sponsorshipPostsPerDay",
      monthly: "sponsorshipPostsPerMonth",
      label: "sponsorship posts",
    } as const;
  }

  if (action === ACTIONS.SEND_INTEREST) {
    return {
      daily: "dealRequestsPerDay",
      monthly: "dealRequestsPerMonth",
      label: "deal requests",
    } as const;
  }

  if (action === ACTIONS.REVEAL_CONTACT) {
    return {
      daily: "contactRevealsPerDay",
      monthly: "contactRevealsPerMonth",
      label: "contact reveals",
    } as const;
  }

if (action === ACTIONS.USE_MATCH) {
  return {
    daily: "matchUsesPerDay",
    monthly: "matchUsesPerMonth",
    label: "match uses",
  } as const;
}
  return null;
}

function isLimitSet(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function checkUsageLimit({
  userId,
  role,
  action,
  amount,
}: CheckUsageLimitInput) {
  const access = await checkSubscriptionAccess({ userId, role, action });

  if (!access.allowed) {
    return {
      allowed: false,
      message: access.message || "Upgrade your plan to use this feature.",
      requiresUpgrade: true,
      reason: access.reason,
    };
  }

  if (access.adminBypass) {
    return {
      allowed: true,
      message: "Admin bypass active.",
      adminBypass: true,
    };
  }

  const subscription = await Subscription.findOne({
    userId,
    role,
    status: {
      $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE],
    },
  })
    .sort({ endDate: -1, createdAt: -1 })
    .lean();

  if (!subscription) {
    return {
      allowed: false,
      message: "No active subscription found.",
      requiresUpgrade: true,
      reason: "NO_SUBSCRIPTION",
    };
  }

  const limits: PlanLimits = subscription.planSnapshot?.limits || {};

  if (
    amount != null &&
    Number.isFinite(amount) &&
    isLimitSet(limits.maxPostBudgetAmount) &&
    amount > limits.maxPostBudgetAmount
  ) {
    return {
      allowed: false,
      message: `Your current plan allows maximum post budget of ₹${limits.maxPostBudgetAmount}.`,
      requiresUpgrade: true,
      reason: "BUDGET_LIMIT_REACHED",
      limit: limits.maxPostBudgetAmount,
    };
  }

  const limitKeys = getLimitKeys(action);

  if (!limitKeys) {
    return {
      allowed: true,
      message: "Access granted.",
      subscriptionId: String(subscription._id),
      planId: subscription.planId ? String(subscription.planId) : null,
    };
  }

  const dailyLimit = limits[limitKeys.daily];
  const monthlyLimit = limits[limitKeys.monthly];

  if (!isLimitSet(dailyLimit) && !isLimitSet(monthlyLimit)) {
    return {
      allowed: true,
      message: "Access granted.",
      subscriptionId: String(subscription._id),
      planId: subscription.planId ? String(subscription.planId) : null,
    };
  }

  const todayKey = getDayKey();
 const monthKey = todayKey.slice(0, 7);
const userObjectId = new mongoose.Types.ObjectId(userId);

  const todayUsage = await UsageCounter.findOne({
    userId: userObjectId,
    role,
    action,
    dayKey: todayKey,
  }).lean();

  const monthlyUsage = await UsageCounter.aggregate([
  {
    $match: {
      userId: userObjectId,
      role,
      action,
      monthKey,
    },
  },
    {
      $group: {
        _id: null,
        total: { $sum: "$dailyCount" },
      },
    },
  ]);

  const dailyCount = Number((todayUsage as any)?.dailyCount || 0);
  const monthlyCount = Number(monthlyUsage[0]?.total || 0);

  if (isLimitSet(dailyLimit) && dailyCount >= dailyLimit) {
    return {
      allowed: false,
      message: `Daily limit reached for ${limitKeys.label}.`,
      requiresUpgrade: true,
      reason: "DAILY_LIMIT_REACHED",
      limit: dailyLimit,
      used: dailyCount,
    };
  }

  if (isLimitSet(monthlyLimit) && monthlyCount >= monthlyLimit) {
    return {
      allowed: false,
      message: `Monthly limit reached for ${limitKeys.label}.`,
      requiresUpgrade: true,
      reason: "MONTHLY_LIMIT_REACHED",
      limit: monthlyLimit,
      used: monthlyCount,
    };
  }

  return {
    allowed: true,
    message: "Access granted.",
    subscriptionId: String(subscription._id),
    planId: subscription.planId ? String(subscription.planId) : null,
    dailyLimit: isLimitSet(dailyLimit) ? dailyLimit : null,
    monthlyLimit: isLimitSet(monthlyLimit) ? monthlyLimit : null,
    dailyUsed: dailyCount,
    monthlyUsed: monthlyCount,
  };
}