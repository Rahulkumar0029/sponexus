import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import User from "@/lib/models/User";
import {
  checkPermission,
  type PermissionAction,
} from "@/lib/subscription/checkPermission";
import { SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";

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

export async function checkSubscriptionAccess({
  userId,
  role,
  action,
}: CheckSubscriptionAccessInput): Promise<CheckSubscriptionAccessResult> {
  const user = await User.findById(userId).select(
    "_id role adminRole accountStatus isDeleted"
  );

  if (!user) {
    return {
      allowed: false,
      message: "User not found.",
    };
  }

  if (user.isDeleted) {
    return {
      allowed: false,
      message: "User not found.",
      adminBypass: false,
      hasActiveSubscription: false,
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
    };
  }

  const adminBypass = isAdminBypass(user);

  if (adminBypass) {
    return {
      allowed: true,
      message: "Admin bypass active.",
      adminBypass: true,
      hasActiveSubscription: true,
    };
  }

  const effectiveRole =
    role === "ORGANIZER" || role === "SPONSOR" ? role : user.role;

  if (effectiveRole !== "ORGANIZER" && effectiveRole !== "SPONSOR") {
    return {
      allowed: false,
      message: "Invalid subscription role.",
      adminBypass: false,
      hasActiveSubscription: false,
    };
  }

  if (effectiveRole !== user.role) {
    return {
      allowed: false,
      message: "Role mismatch for subscription access.",
      adminBypass: false,
      hasActiveSubscription: false,
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
    };
  }

  const plan = await Plan.findById(subscription.planId).select(
    "_id role isActive canPublish canContact canUseMatch canRevealContact"
  );

  if (!plan) {
    return {
      allowed: false,
      message: "Active plan not found.",
      adminBypass: false,
      hasActiveSubscription: true,
    };
  }

  if (!plan.isActive) {
    return {
      allowed: false,
      message: "Your current plan is inactive.",
      adminBypass: false,
      hasActiveSubscription: true,
    };
  }

  if (plan.role !== effectiveRole) {
    return {
      allowed: false,
      message: "Plan role mismatch.",
      adminBypass: false,
      hasActiveSubscription: true,
    };
  }

  const allowed = checkPermission(action, {
    role: effectiveRole,
    hasActiveSubscription: true,
    adminBypass: false,
    plan: {
      canPublish: Boolean(plan.canPublish),
      canContact: Boolean(plan.canContact),
      canUseMatch: Boolean(plan.canUseMatch),
      canRevealContact: Boolean(plan.canRevealContact),
    },
  });

  if (!allowed) {
    return {
      allowed: false,
      message: getUpgradeMessage(action),
      adminBypass: false,
      hasActiveSubscription: true,
    };
  }

  return {
    allowed: true,
    message: "Access granted.",
    adminBypass: false,
    hasActiveSubscription: true,
  };
}