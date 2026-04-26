import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import User from "@/lib/models/User";
import {
  checkPermission,
  type PermissionAction,
} from "@/lib/subscription/checkPermission";
import { SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";

type SupportedRole = "ORGANIZER" | "SPONSOR";
type PlanRole = "ORGANIZER" | "SPONSOR" | "BOTH";

type PlanFeatures = {
  canPublishEvent?: boolean;
  canPublishSponsorship?: boolean;
  canUseMatch?: boolean;
  canRevealContact?: boolean;
  canSendDealRequest?: boolean;
};

type CheckSubscriptionAccessInput = {
  userId: string;
  role?: string | null;
  action: PermissionAction;
};

type CheckSubscriptionAccessResult = {
  allowed: boolean;
  message?: string;
  adminBypass?: boolean;
  hasActiveSubscription?: boolean;
  subscriptionId?: string | null;
  planId?: string | null;
  reason?:
    | "ADMIN_BYPASS"
    | "USER_NOT_FOUND"
    | "ACCOUNT_RESTRICTED"
    | "INVALID_ROLE"
    | "ROLE_MISMATCH"
    | "NO_SUBSCRIPTION"
    | "SUBSCRIPTION_INACTIVE"
    | "SUBSCRIPTION_EXPIRED"
    | "GRACE_ENDED"
    | "PLAN_MISSING"
    | "PLAN_INACTIVE"
    | "PLAN_ARCHIVED"
    | "PLAN_ROLE_MISMATCH"
    | "ACTION_NOT_ALLOWED"
    | "OK";
};

function getUpgradeMessage(action: PermissionAction) {
  if (action === "PUBLISH_EVENT") {
    return "Upgrade your subscription to publish events on Sponexus.";
  }

  if (action === "PUBLISH_SPONSORSHIP") {
    return "Upgrade your subscription to create sponsorship posts on Sponexus.";
  }

  if (action === "SEND_INTEREST") {
    return "Upgrade your subscription to send interest on Sponexus.";
  }

  if (action === "USE_MATCH") {
    return "Upgrade your subscription to use smart matching on Sponexus.";
  }

  if (action === "REVEAL_CONTACT") {
    return "Upgrade your subscription to reveal contact details on Sponexus.";
  }

  return "This feature is not available on your current plan.";
}

function isSupportedRole(role: unknown): role is SupportedRole {
  return role === "ORGANIZER" || role === "SPONSOR";
}

function isPlanAllowedForRole(planRole: PlanRole, userRole: SupportedRole) {
  return planRole === "BOTH" || planRole === userRole;
}

function isPlanRole(role: unknown): role is PlanRole {
  return role === "ORGANIZER" || role === "SPONSOR" || role === "BOTH";
}

function isExplicitFalse(value: unknown) {
  return value === false;
}

function isActionAllowedByDynamicFeatures(
  action: PermissionAction,
  features?: PlanFeatures | null
) {
  if (!features) return true;

  if (action === "PUBLISH_EVENT") {
    return !isExplicitFalse(features.canPublishEvent);
  }

  if (action === "PUBLISH_SPONSORSHIP") {
    return !isExplicitFalse(features.canPublishSponsorship);
  }

  if (action === "USE_MATCH") {
    return !isExplicitFalse(features.canUseMatch);
  }

  if (action === "REVEAL_CONTACT") {
    return !isExplicitFalse(features.canRevealContact);
  }

  if (action === "SEND_INTEREST") {
    return !isExplicitFalse(features.canSendDealRequest);
  }

  return true;
}

export async function checkSubscriptionAccess({
  userId,
  role,
  action,
}: CheckSubscriptionAccessInput): Promise<CheckSubscriptionAccessResult> {
  const user = await User.findById(userId).select(
    "_id role adminRole accountStatus isDeleted"
  );

  if (!user || user.isDeleted) {
    return {
      allowed: false,
      message: "User not found.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId: null,
      planId: null,
      reason: "USER_NOT_FOUND",
    };
  }

  if (
    user.accountStatus === "SUSPENDED" ||
    user.accountStatus === "DISABLED"
  ) {
    return {
      allowed: false,
      message: "Account access restricted.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId: null,
      planId: null,
      reason: "ACCOUNT_RESTRICTED",
    };
  }

  if (isAdminBypass(user)) {
    return {
      allowed: true,
      message: "Admin bypass active.",
      adminBypass: true,
      hasActiveSubscription: true,
      subscriptionId: null,
      planId: null,
      reason: "ADMIN_BYPASS",
    };
  }

  const effectiveRole = isSupportedRole(role) ? role : user.role;

  if (!isSupportedRole(effectiveRole)) {
    return {
      allowed: false,
      message: "Invalid subscription role.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId: null,
      planId: null,
      reason: "INVALID_ROLE",
    };
  }

  if (effectiveRole !== user.role) {
    return {
      allowed: false,
      message: "Role mismatch for subscription access.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId: null,
      planId: null,
      reason: "ROLE_MISMATCH",
    };
  }

  const subscription = await Subscription.findOne({
    userId: user._id,
    role: effectiveRole,
    status: {
      $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE],
    },
  }).sort({ endDate: -1, createdAt: -1 });

  if (!subscription) {
    return {
      allowed: false,
      message: "No active subscription found.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId: null,
      planId: null,
      reason: "NO_SUBSCRIPTION",
    };
  }

  const subscriptionId = String(subscription._id);
  const planId = subscription.planId ? String(subscription.planId) : null;

  if (subscription.isActive === false) {
    return {
      allowed: false,
      message: "Your subscription is inactive.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId,
      planId,
      reason: "SUBSCRIPTION_INACTIVE",
    };
  }

  const now = new Date();

  if (
    subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
    subscription.endDate &&
    new Date(subscription.endDate) < now
  ) {
    return {
      allowed: false,
      message: "Your subscription has expired.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId,
      planId,
      reason: "SUBSCRIPTION_EXPIRED",
    };
  }

  if (
    subscription.status === SUBSCRIPTION_STATUS.GRACE &&
    (!subscription.graceEndDate || new Date(subscription.graceEndDate) < now)
  ) {
    return {
      allowed: false,
      message: "Your subscription grace period has ended.",
      adminBypass: false,
      hasActiveSubscription: false,
      subscriptionId,
      planId,
      reason: "GRACE_ENDED",
    };
  }

  const snapshot = subscription.planSnapshot || null;

  let entitlementSource: {
    role: PlanRole;
    canPublish: boolean;
    canContact: boolean;
    canUseMatch: boolean;
    canRevealContact: boolean;
    features?: PlanFeatures | null;
  } | null = null;

  if (snapshot) {
    const planSnapshot = snapshot as typeof snapshot & {
      features?: PlanFeatures | null;
    };

    if (!isPlanRole(planSnapshot.role)) {
      return {
        allowed: false,
        message: "Plan role mismatch.",
        adminBypass: false,
        hasActiveSubscription: true,
        subscriptionId,
        planId,
        reason: "PLAN_ROLE_MISMATCH",
      };
    }

    if (!isPlanAllowedForRole(planSnapshot.role, effectiveRole)) {
      return {
        allowed: false,
        message: "Plan role mismatch.",
        adminBypass: false,
        hasActiveSubscription: true,
        subscriptionId,
        planId,
        reason: "PLAN_ROLE_MISMATCH",
      };
    }

    entitlementSource = {
      role: planSnapshot.role,
      canPublish: Boolean(planSnapshot.canPublish),
      canContact: Boolean(planSnapshot.canContact),
      canUseMatch: Boolean(planSnapshot.canUseMatch),
      canRevealContact: Boolean(planSnapshot.canRevealContact),
      features: planSnapshot.features || null,
    };
  } else {
    const livePlan = await Plan.findById(subscription.planId).select(
      "_id role isActive isArchived canPublish canContact canUseMatch canRevealContact features"
    );

    if (!livePlan) {
      return {
        allowed: false,
        message: "Active plan not found.",
        adminBypass: false,
        hasActiveSubscription: true,
        subscriptionId,
        planId,
        reason: "PLAN_MISSING",
      };
    }

    if (!livePlan.isActive) {
      return {
        allowed: false,
        message: "Your current plan is inactive.",
        adminBypass: false,
        hasActiveSubscription: true,
        subscriptionId,
        planId,
        reason: "PLAN_INACTIVE",
      };
    }

    if (livePlan.isArchived) {
      return {
        allowed: false,
        message: "Your current plan is no longer available.",
        adminBypass: false,
        hasActiveSubscription: true,
        subscriptionId,
        planId,
        reason: "PLAN_ARCHIVED",
      };
    }

    if (!isPlanAllowedForRole(livePlan.role, effectiveRole)) {
      return {
        allowed: false,
        message: "Plan role mismatch.",
        adminBypass: false,
        hasActiveSubscription: true,
        subscriptionId,
        planId,
        reason: "PLAN_ROLE_MISMATCH",
      };
    }

    entitlementSource = {
      role: livePlan.role,
      canPublish: Boolean(livePlan.canPublish),
      canContact: Boolean(livePlan.canContact),
      canUseMatch: Boolean(livePlan.canUseMatch),
      canRevealContact: Boolean(livePlan.canRevealContact),
      features: livePlan.features || null,
    };
  }

  const allowedByOldPermission = checkPermission(action, {
    role: effectiveRole,
    hasActiveSubscription: true,
    adminBypass: false,
    plan: {
      canPublish: entitlementSource.canPublish,
      canContact: entitlementSource.canContact,
      canUseMatch: entitlementSource.canUseMatch,
      canRevealContact: entitlementSource.canRevealContact,
    },
  });

  if (!allowedByOldPermission) {
    return {
      allowed: false,
      message: getUpgradeMessage(action),
      adminBypass: false,
      hasActiveSubscription: true,
      subscriptionId,
      planId,
      reason: "ACTION_NOT_ALLOWED",
    };
  }

  const allowedByDynamicFeatures = isActionAllowedByDynamicFeatures(
  action,
  entitlementSource.features
);

  if (!allowedByDynamicFeatures) {
    return {
      allowed: false,
      message: getUpgradeMessage(action),
      adminBypass: false,
      hasActiveSubscription: true,
      subscriptionId,
      planId,
      reason: "ACTION_NOT_ALLOWED",
    };
  }

  return {
    allowed: true,
    message: "Access granted.",
    adminBypass: false,
    hasActiveSubscription: true,
    subscriptionId,
    planId,
    reason: "OK",
  };
}