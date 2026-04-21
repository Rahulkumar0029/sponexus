import type { PlanRole } from "@/types/subscription";
import { ACTIONS } from "@/lib/subscription/constants";

export type SubscriptionPermissionAction =
  | typeof ACTIONS.PUBLISH_EVENT
  | typeof ACTIONS.PUBLISH_SPONSORSHIP
  | typeof ACTIONS.SEND_INTEREST
  | typeof ACTIONS.USE_MATCH
  | typeof ACTIONS.REVEAL_CONTACT;

export function isOrganizerRole(role?: string | null): role is "ORGANIZER" {
  return role === "ORGANIZER";
}

export function isSponsorRole(role?: string | null): role is "SPONSOR" {
  return role === "SPONSOR";
}

export function canRoleAttemptAction(
  role: string | null | undefined,
  action: SubscriptionPermissionAction
): boolean {
  const organizerActions: SubscriptionPermissionAction[] = [
    ACTIONS.PUBLISH_EVENT,
    ACTIONS.SEND_INTEREST,
    ACTIONS.USE_MATCH,
    ACTIONS.REVEAL_CONTACT,
  ];

  const sponsorActions: SubscriptionPermissionAction[] = [
    ACTIONS.PUBLISH_SPONSORSHIP,
    ACTIONS.SEND_INTEREST,
    ACTIONS.USE_MATCH,
    ACTIONS.REVEAL_CONTACT,
  ];

  if (isOrganizerRole(role)) {
    return organizerActions.includes(action);
  }

  if (isSponsorRole(role)) {
    return sponsorActions.includes(action);
  }

  return false;
}

export function doesPlanRoleMatchUserRole(
  planRole?: PlanRole | string | null,
  userRole?: string | null
): boolean {
  if (!planRole || !userRole) return false;
  return planRole === userRole;
}

export function getRoleDisplayLabel(role?: string | null): string {
  if (role === "ORGANIZER") return "Organizer";
  if (role === "SPONSOR") return "Sponsor";
  return "User";
}

export function getActionDisplayLabel(
  action: SubscriptionPermissionAction
): string {
  switch (action) {
    case ACTIONS.PUBLISH_EVENT:
      return "Publish Event";
    case ACTIONS.PUBLISH_SPONSORSHIP:
      return "Publish Sponsorship";
    case ACTIONS.SEND_INTEREST:
      return "Send Interest";
    case ACTIONS.USE_MATCH:
      return "Use Match";
    case ACTIONS.REVEAL_CONTACT:
      return "Reveal Contact";
    default:
      return "Action";
  }
}