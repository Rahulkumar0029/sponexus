'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/types/user';

type LoginResponseUser = User & {
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;
};

function isAdminUser(user: LoginResponseUser | null): boolean {
  if (!user) return false;

  return user.adminRole === 'ADMIN' || user.adminRole === 'SUPER_ADMIN';
}

export function useAuth() {
  const [user, setUser] = useState<LoginResponseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        clearAuthState();
        return null;
      }

      const data = await res.json();
      const currentUser: LoginResponseUser | null = data?.user || null;

      if (!currentUser) {
        clearAuthState();
        return null;
      }

      setUser(currentUser);
      setIsAuthenticated(true);

      return currentUser;
    } catch (err: any) {
      clearAuthState();
      setError(err?.message || 'Failed to fetch user');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Login failed');
      }

      const loggedInUser: LoginResponseUser | null = data?.user || null;

      if (!loggedInUser) {
        throw new Error('Login succeeded but user data was missing');
      }

      setUser(loggedInUser);
      setIsAuthenticated(true);

      return loggedInUser;
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      setError(message);
      clearAuthState();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
    } catch {
      // ignore logout fetch errors and still clear local UI state
    } finally {
      clearAuthState();
      setError(null);
      setLoading(false);
    }
  }, [clearAuthState]);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);
  const isOrganizer = user?.role === 'ORGANIZER';
  const isSponsor = user?.role === 'SPONSOR';
  const adminRole = user?.adminRole || 'NONE';

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    adminRole,
    isOrganizer,
    isSponsor,
    login,
    logout,
    refreshUser: fetchCurrentUser,
  };
}