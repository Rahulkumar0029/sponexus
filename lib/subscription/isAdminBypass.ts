type MinimalUser = {
  role?: string;
  adminRole?: string;
  isAdmin?: boolean;
};

// Only these roles get FULL bypass
const FULL_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export function isAdminBypass(user?: MinimalUser | null): boolean {
  if (!user) return false;

  // 🔒 Hard check for adminRole only
  if (typeof user.adminRole === "string") {
    if (FULL_ADMIN_ROLES.includes(user.adminRole as any)) {
      return true;
    }
  }

  return false;
}