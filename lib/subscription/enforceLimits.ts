import { Types } from "mongoose";

import UsageCounter, {
  type UsageAction,
} from "@/lib/models/UsageCounter";

type SupportedRole = "ORGANIZER" | "SPONSOR";

type PlanLimits = {
  eventPostsPerDay?: number | null;
  sponsorshipPostsPerDay?: number | null;
  dealRequestsPerDay?: number | null;
  contactRevealsPerDay?: number | null;

  eventPostsPerMonth?: number | null;
  sponsorshipPostsPerMonth?: number | null;
  dealRequestsPerMonth?: number | null;
 contactRevealsPerMonth?: number | null;
matchUsesPerDay?: number | null;
matchUsesPerMonth?: number | null;

maxPostBudgetAmount?: number | null;
  maxVisibleBudgetAmount?: number | null;
};

type EnforceLimitInput = {
  userId: string | Types.ObjectId;
  role: SupportedRole;
  action: UsageAction;
  limits?: PlanLimits | null;
  subscriptionId?: string | Types.ObjectId | null;
  planId?: string | Types.ObjectId | null;
};

type IncrementUsageInput = EnforceLimitInput;

type LimitCheckResult = {
  allowed: boolean;
  message: string;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  dailyUsed: number;
  monthlyUsed: number;
};

function toObjectId(value: string | Types.ObjectId) {
  return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function getLimitForAction(action: UsageAction, limits?: PlanLimits | null) {
  if (!limits) {
    return {
      dailyLimit: null,
      monthlyLimit: null,
    };
  }

  if (action === "PUBLISH_EVENT") {
    return {
      dailyLimit: limits.eventPostsPerDay ?? null,
      monthlyLimit: limits.eventPostsPerMonth ?? null,
    };
  }

  if (action === "PUBLISH_SPONSORSHIP") {
    return {
      dailyLimit: limits.sponsorshipPostsPerDay ?? null,
      monthlyLimit: limits.sponsorshipPostsPerMonth ?? null,
    };
  }

  if (action === "SEND_INTEREST") {
    return {
      dailyLimit: limits.dealRequestsPerDay ?? null,
      monthlyLimit: limits.dealRequestsPerMonth ?? null,
    };
  }

  if (action === "REVEAL_CONTACT") {
    return {
      dailyLimit: limits.contactRevealsPerDay ?? null,
      monthlyLimit: limits.contactRevealsPerMonth ?? null,
    };
  }

if (action === "USE_MATCH") {
  return {
    dailyLimit: limits.matchUsesPerDay ?? null,
    monthlyLimit: limits.matchUsesPerMonth ?? null,
  };
}

  return {
    dailyLimit: null,
    monthlyLimit: null,
  };
}

export async function checkUsageLimit({
  userId,
  role,
  action,
  limits,
}: EnforceLimitInput): Promise<LimitCheckResult> {
  const dayKey = getDayKey();
  const monthKey = getMonthKey();

  const { dailyLimit, monthlyLimit } = getLimitForAction(action, limits);

  const dailyRecord = await UsageCounter.findOne({
    userId: toObjectId(userId),
    role,
    action,
    dayKey,
  }).select("dailyCount monthlyCount");

  const monthlyRecords = await UsageCounter.find({
    userId: toObjectId(userId),
    role,
    action,
    monthKey,
  }).select("dailyCount");

  const dailyUsed = dailyRecord?.dailyCount || 0;

  const monthlyUsed = monthlyRecords.reduce(
    (sum, record) => sum + Number(record.dailyCount || 0),
    0
  );

  if (dailyLimit != null && dailyUsed >= dailyLimit) {
    return {
      allowed: false,
      message: `Daily limit reached for ${action}.`,
      dailyLimit,
      monthlyLimit,
      dailyUsed,
      monthlyUsed,
    };
  }

  if (monthlyLimit != null && monthlyUsed >= monthlyLimit) {
    return {
      allowed: false,
      message: `Monthly limit reached for ${action}.`,
      dailyLimit,
      monthlyLimit,
      dailyUsed,
      monthlyUsed,
    };
  }

  return {
    allowed: true,
    message: "Usage allowed.",
    dailyLimit,
    monthlyLimit,
    dailyUsed,
    monthlyUsed,
  };
}

export async function incrementUsage({
  userId,
  role,
  action,
  subscriptionId = null,
  planId = null,
}: IncrementUsageInput) {
  const dayKey = getDayKey();
  const monthKey = getMonthKey();

  return UsageCounter.findOneAndUpdate(
    {
      userId: toObjectId(userId),
      role,
      action,
      dayKey,
    },
    {
      $setOnInsert: {
        monthKey,
        subscriptionId: subscriptionId ? toObjectId(subscriptionId) : null,
        planId: planId ? toObjectId(planId) : null,
      },
      $inc: {
        dailyCount: 1,
        monthlyCount: 1,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}