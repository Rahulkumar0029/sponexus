/**
 * Server-side authentication utilities for Sponexus
 * Use these in Server Components and API Routes
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextAuthOptions';
import { User, UserRole } from '@/types/user';

/**
 * Get the current authenticated session on the server
 */
export async function getCurrentSession() {
  try {
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Get the current authenticated user on the server
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return null;
    }

    // In a real app, you might fetch this from database
    // For now, return from session
    return {
      _id: (session.user as any).id,
      name: session.user.name || '',
      email: session.user.email || '',
      role: (session.user as any).role as UserRole,
      firstName: session.user.name?.split(' ')[0] || '',
      lastName: session.user.name?.split(' ')[1] || '',
      companyName: '',
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
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
  } catch (error) {
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
  } catch (error) {
    return false;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error('Unauthorized: Session not found');
  }
  return session;
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
