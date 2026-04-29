import { Types } from "mongoose";

import UsageCounter, {
  type UsageAction,
} from "@/lib/models/UsageCounter";

type SupportedRole = "ORGANIZER" | "SPONSOR";

type IncrementUsageInput = {
  userId: string | Types.ObjectId;
  role: SupportedRole;
  action: UsageAction;
  subscriptionId?: string | Types.ObjectId | null;
  planId?: string | Types.ObjectId | null;
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
      },
      $set: {
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