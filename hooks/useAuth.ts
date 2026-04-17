'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/user';

type LoginResponseUser = User & {
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<LoginResponseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        return null;
      }

      const data = await res.json();
      const currentUser: LoginResponseUser | null = data?.user || null;

      if (!currentUser) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        return null;
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(currentUser));

      return currentUser;
    } catch (err: any) {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      setError(err?.message || 'Failed to fetch user');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

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
      localStorage.setItem('user', JSON.stringify(loggedInUser));

      return loggedInUser;
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      setError(message);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore logout fetch errors and still clear local UI state
    } finally {
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    refreshUser: fetchCurrentUser,
  };
}