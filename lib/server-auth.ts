/**
 * Server-side authentication utilities for Sponexus
 * Use these in Server Components and API Routes
 */

import { getCurrentUser as getCustomCurrentUser } from "@/lib/current-user";
import { User, UserRole } from "@/types/user";

/**
 * Get the current authenticated user on the server
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await getCustomCurrentUser();

    if (!user) {
      return null;
    }

    return {
      _id: String(user._id || ""),
      name: user.name || "",
      email: user.email || "",
      role: user.role as UserRole,
      firstName: user.firstName || user.name?.split(" ")[0] || "",
      lastName: user.lastName || user.name?.split(" ").slice(1).join(" ") || "",
      companyName: user.companyName || "",
    };
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Get the current authenticated server auth state
 * Kept for compatibility with older calls expecting a session-like object
 */
export async function getCurrentSession() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    return {
      user,
    };
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user?.role === role;
  } catch {
    return false;
  }
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user ? roles.includes(user.role) : false;
  } catch {
    return false;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: User not found");
  }

  return user;
}

/**
 * Require specific role - throws if user doesn't have role
 */
export async function requireRole(role: UserRole) {
  const user = await getCurrentUser();

  if (!user || user.role !== role) {
    throw new Error(`Unauthorized: Required role ${role}`);
  }

  return user;
}