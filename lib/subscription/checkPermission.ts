import { ACTIONS } from "@/lib/subscription/constants";

export type PermissionAction =
  | typeof ACTIONS.PUBLISH_EVENT
  | typeof ACTIONS.PUBLISH_SPONSORSHIP
  | typeof ACTIONS.SEND_INTEREST
  | typeof ACTIONS.USE_MATCH
  | typeof ACTIONS.REVEAL_CONTACT;

type PermissionInput = {
  role?: string;
  hasActiveSubscription?: boolean;
  adminBypass?: boolean;
  plan?: {
    canPublish?: boolean;
    canContact?: boolean;
    canUseMatch?: boolean;
    canRevealContact?: boolean;
  } | null;
};

export function checkPermission(
  action: PermissionAction,
  input: PermissionInput
): boolean {
  const { role, hasActiveSubscription, adminBypass, plan } = input;

  if (adminBypass) return true;

  if (!hasActiveSubscription) {
    return false;
  }

  if (role !== "ORGANIZER" && role !== "SPONSOR") {
    return false;
  }

  if (!plan) {
    return false;
  }

  if (action === ACTIONS.PUBLISH_EVENT) {
    return role === "ORGANIZER" && Boolean(plan.canPublish);
  }

  if (action === ACTIONS.PUBLISH_SPONSORSHIP) {
    return role === "SPONSOR" && Boolean(plan.canPublish);
  }

  if (action === ACTIONS.SEND_INTEREST) {
    return Boolean(plan.canContact);
  }

  if (action === ACTIONS.USE_MATCH) {
    return Boolean(plan.canUseMatch);
  }

  if (action === ACTIONS.REVEAL_CONTACT) {
    return Boolean(plan.canRevealContact);
  }

  return false;
}