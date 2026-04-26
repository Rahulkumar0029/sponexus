import { ACTIONS } from "@/lib/subscription/constants";

export type PermissionAction =
  | typeof ACTIONS.PUBLISH_EVENT
  | typeof ACTIONS.PUBLISH_SPONSORSHIP
  | typeof ACTIONS.SEND_INTEREST
  | typeof ACTIONS.USE_MATCH
  | typeof ACTIONS.REVEAL_CONTACT;

type SupportedRole = "ORGANIZER" | "SPONSOR";

type PermissionInput = {
  role?: string | null;
  hasActiveSubscription?: boolean;
  adminBypass?: boolean;
  plan?: {
    canPublish?: boolean;
    canContact?: boolean;
    canUseMatch?: boolean;
    canRevealContact?: boolean;
  } | null;
};

function isSupportedRole(role: unknown): role is SupportedRole {
  return role === "ORGANIZER" || role === "SPONSOR";
}

export function checkPermission(
  action: PermissionAction,
  input: PermissionInput
): boolean {
  const { role, hasActiveSubscription, adminBypass, plan } = input;

  /* ===============================
     ADMIN BYPASS
  =============================== */
  if (adminBypass === true) return true;

  /* ===============================
     SUBSCRIPTION REQUIRED
  =============================== */
  if (!hasActiveSubscription) return false;

  /* ===============================
     ROLE VALIDATION
  =============================== */
  if (!isSupportedRole(role)) return false;

  /* ===============================
     PLAN REQUIRED
  =============================== */
  if (!plan) return false;

  /* ===============================
     PERMISSION MATRIX
  =============================== */

  switch (action) {
    case ACTIONS.PUBLISH_EVENT:
      return role === "ORGANIZER" && plan.canPublish === true;

    case ACTIONS.PUBLISH_SPONSORSHIP:
      return role === "SPONSOR" && plan.canPublish === true;

    case ACTIONS.SEND_INTEREST:
      return plan.canContact === true;

    case ACTIONS.USE_MATCH:
      return plan.canUseMatch === true;

    case ACTIONS.REVEAL_CONTACT:
      return plan.canRevealContact === true;

    default:
      return false;
  }
}