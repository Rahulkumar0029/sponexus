import type { IPlan } from "@/lib/models/Plan";
import type { ISubscription } from "@/lib/models/Subscription";
import { ACTIONS, SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";

type AccessAction =
  | typeof ACTIONS.PUBLISH_EVENT
  | typeof ACTIONS.PUBLISH_SPONSORSHIP
  | typeof ACTIONS.SEND_INTEREST
  | typeof ACTIONS.USE_MATCH
  | typeof ACTIONS.REVEAL_CONTACT;

type MinimalUser = {
  role?: string;
  adminRole?: string;
  isAdmin?: boolean;
};

type AccessResult = {
  allowed: boolean;
  reason:
    | "ADMIN_BYPASS"
    | "NO_USER"
    | "NO_SUBSCRIPTION"
    | "ROLE_MISMATCH"
    | "PLAN_MISSING"
    | "PLAN_INACTIVE"
    | "SUBSCRIPTION_INACTIVE"
    | "ACTION_NOT_ALLOWED"
    | "OK";
  message: string;
};

function isSubscriptionUsable(subscription?: ISubscription | null): boolean {
  if (!subscription) return false;

  return (
    subscription.status === SUBSCRIPTION_STATUS.ACTIVE ||
    subscription.status === SUBSCRIPTION_STATUS.GRACE
  );
}

function doesPlanAllowAction(
  plan: IPlan,
  action: AccessAction,
  userRole?: string
): boolean {
  switch (action) {
    case ACTIONS.PUBLISH_EVENT:
      return userRole === "ORGANIZER" && plan.canPublish;

    case ACTIONS.PUBLISH_SPONSORSHIP:
      return userRole === "SPONSOR" && plan.canPublish;

    case ACTIONS.SEND_INTEREST:
      return plan.canContact;

    case ACTIONS.USE_MATCH:
      return plan.canUseMatch;

    case ACTIONS.REVEAL_CONTACT:
      return plan.canRevealContact;

    default:
      return false;
  }
}

export function canUserAccessSubscriptionFeature({
  user,
  subscription,
  plan,
  action,
}: {
  user?: MinimalUser | null;
  subscription?: ISubscription | null;
  plan?: IPlan | null;
  action: AccessAction;
}): AccessResult {
  if (!user) {
    return {
      allowed: false,
      reason: "NO_USER",
      message: "Please log in to continue.",
    };
  }

  if (isAdminBypass(user)) {
    return {
      allowed: true,
      reason: "ADMIN_BYPASS",
      message: "Admin access granted.",
    };
  }

  if (!subscription) {
    return {
      allowed: false,
      reason: "NO_SUBSCRIPTION",
      message: "An active subscription is required to access this feature.",
    };
  }

  if (subscription.role !== user.role) {
    return {
      allowed: false,
      reason: "ROLE_MISMATCH",
      message: "Your account role does not match the required subscription.",
    };
  }

  if (!isSubscriptionUsable(subscription)) {
    return {
      allowed: false,
      reason: "SUBSCRIPTION_INACTIVE",
      message: "Your subscription is inactive or expired. Please renew to continue.",
    };
  }

  if (!plan) {
    return {
      allowed: false,
      reason: "PLAN_MISSING",
      message: "Plan details could not be found.",
    };
  }

  if (!plan.isActive) {
    return {
      allowed: false,
      reason: "PLAN_INACTIVE",
      message: "This subscription plan is currently inactive.",
    };
  }

  if (!doesPlanAllowAction(plan, action, user.role)) {
    return {
      allowed: false,
      reason: "ACTION_NOT_ALLOWED",
      message: "Your current plan does not allow this action.",
    };
  }

  return {
    allowed: true,
    reason: "OK",
    message: "Access granted.",
  };
}