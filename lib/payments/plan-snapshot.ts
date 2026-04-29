import { Types } from "mongoose";
import Plan, { IPlan } from "@/lib/models/Plan";
import { IPlanSnapshot } from "@/lib/models/Subscription";

/**
 * Creates a full immutable snapshot of a plan at purchase time.
 */
export function buildPlanSnapshot(plan: IPlan): IPlanSnapshot {
  if (
    typeof plan.price !== "number" ||
    !Number.isFinite(plan.price) ||
    plan.price < 0
  ) {
    throw new Error("Invalid plan price in snapshot");
  }

  return {
    planId:
      plan._id instanceof Types.ObjectId
        ? plan._id
        : new Types.ObjectId(String(plan._id)),

    code: plan.code,
    name: plan.name,
    role: plan.role,

    price: plan.price,
    currency: plan.currency,

    durationInDays: plan.durationInDays,
    extraDays: plan.extraDays || 0,

    postingLimitPerDay: plan.postingLimitPerDay ?? null,
    dealRequestLimitPerDay: plan.dealRequestLimitPerDay ?? null,

    canPublish: Boolean(plan.canPublish),
    canContact: Boolean(plan.canContact),
    canUseMatch: Boolean(plan.canUseMatch),
    canRevealContact: Boolean(plan.canRevealContact),

    budgetMin: plan.budgetMin ?? null,
    budgetMax: plan.budgetMax ?? null,

   features: {
  canPublishEvent: plan.features?.canPublishEvent !== false,
  canPublishSponsorship: plan.features?.canPublishSponsorship !== false,
  canUseMatch: plan.features?.canUseMatch !== false,
  canRevealContact: plan.features?.canRevealContact !== false,
  canSendDealRequest: plan.features?.canSendDealRequest !== false,
},

    limits: {
      eventPostsPerDay: plan.limits?.eventPostsPerDay ?? null,
      sponsorshipPostsPerDay: plan.limits?.sponsorshipPostsPerDay ?? null,
      dealRequestsPerDay: plan.limits?.dealRequestsPerDay ?? null,
      contactRevealsPerDay: plan.limits?.contactRevealsPerDay ?? null,
      matchUsesPerDay: plan.limits?.matchUsesPerDay ?? null,

      eventPostsPerMonth: plan.limits?.eventPostsPerMonth ?? null,
      sponsorshipPostsPerMonth: plan.limits?.sponsorshipPostsPerMonth ?? null,
      dealRequestsPerMonth: plan.limits?.dealRequestsPerMonth ?? null,
      contactRevealsPerMonth: plan.limits?.contactRevealsPerMonth ?? null,
      matchUsesPerMonth: plan.limits?.matchUsesPerMonth ?? null,

      maxPostBudgetAmount: plan.limits?.maxPostBudgetAmount ?? null,
      maxVisibleBudgetAmount: plan.limits?.maxVisibleBudgetAmount ?? null,
    },
  };
}

/**
 * Fetch plan and create snapshot safely.
 */
export async function getPlanSnapshotById(planId: string) {
  const plan = await Plan.findById(planId);

  if (!plan) {
    throw new Error("Plan not found while creating snapshot");
  }

  if (!plan.isActive || plan.isArchived) {
    throw new Error("Plan is not available for subscription");
  }

  return buildPlanSnapshot(plan);
}