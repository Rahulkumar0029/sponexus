import UsageCounter from "@/lib/models/UsageCounter";
import type { PermissionAction } from "@/lib/subscription/checkPermission";

type IncrementUsageInput = {
  userId: string;
  role: "ORGANIZER" | "SPONSOR";
  action: PermissionAction;
  subscriptionId?: string | null;
  planId?: string | null;
};

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
  subscriptionId,
  planId,
}: IncrementUsageInput) {
  const now = new Date();
  const dayKey = getDayKey(now);
  const monthKey = getMonthKey(now);

  return UsageCounter.findOneAndUpdate(
    {
      userId,
      role,
      action,
      dayKey,
    },
    {
      $setOnInsert: {
        userId,
        role,
        action,
        dayKey,
        monthKey,
      },
      $set: {
        subscriptionId: subscriptionId || null,
        planId: planId || null,
      },
      $inc: {
        dailyCount: 1,
        monthlyCount: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );
}