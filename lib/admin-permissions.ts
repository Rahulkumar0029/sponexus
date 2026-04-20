import type { AdminRole } from "@/lib/models/User";

export type AdminPermission =
  | "admin:access"
  | "admin:users:read"
  | "admin:users:suspend"
  | "admin:users:reactivate"
  | "admin:users:delete"
  | "admin:users:revoke-sessions"
  | "admin:events:read"
  | "admin:events:moderate"
  | "admin:sponsorships:read"
  | "admin:sponsorships:moderate"
  | "admin:deals:read"
  | "admin:deals:moderate"
  | "admin:deals:freeze"
  | "admin:analytics:read"
  | "admin:audit:read"
  | "admin:admins:manage";

const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  NONE: [],

  SUPPORT_ADMIN: [
    "admin:access",
    "admin:users:read",
    "admin:users:revoke-sessions",
    "admin:events:read",
    "admin:sponsorships:read",
    "admin:deals:read",
  ],

  VERIFICATION_ADMIN: [
    "admin:access",
    "admin:users:read",
    "admin:events:read",
    "admin:events:moderate",
    "admin:sponsorships:read",
    "admin:sponsorships:moderate",
    "admin:deals:read",
  ],

  ADMIN: [
    "admin:access",
    "admin:users:read",
    "admin:users:suspend",
    "admin:users:reactivate",
    "admin:users:revoke-sessions",
    "admin:events:read",
    "admin:events:moderate",
    "admin:sponsorships:read",
    "admin:sponsorships:moderate",
    "admin:deals:read",
    "admin:deals:moderate",
    "admin:deals:freeze",
    "admin:analytics:read",
    "admin:audit:read",
  ],

  SUPER_ADMIN: [
    "admin:access",
    "admin:users:read",
    "admin:users:suspend",
    "admin:users:reactivate",
    "admin:users:delete",
    "admin:users:revoke-sessions",
    "admin:events:read",
    "admin:events:moderate",
    "admin:sponsorships:read",
    "admin:sponsorships:moderate",
    "admin:deals:read",
    "admin:deals:moderate",
    "admin:deals:freeze",
    "admin:analytics:read",
    "admin:audit:read",
    "admin:admins:manage",
  ],
};

export function getAdminPermissions(adminRole: AdminRole): AdminPermission[] {
  return ADMIN_ROLE_PERMISSIONS[adminRole] ?? [];
}

export function hasAdminPermission(
  adminRole: AdminRole,
  permission: AdminPermission
): boolean {
  return getAdminPermissions(adminRole).includes(permission);
}

export function isAdminRole(adminRole?: string | null): boolean {
  return !!adminRole && adminRole !== "NONE";
}