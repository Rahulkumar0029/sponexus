'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn, signOut, useSession, getSession } from 'next-auth/react';
import { User, UserRole } from '@/types/user';

function normalizeUser(sessionUser: any): User {
  const name = sessionUser.name || '';
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');

  return {
    _id: sessionUser.id || '',
    name,
    email: sessionUser.email || '',
    role: sessionUser.role as UserRole,
    firstName: firstName || '',
    lastName: lastName || '',
    companyName: sessionUser.companyName || '',
  };
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const authUser = normalizeUser(session.user);
      setUser(authUser);
      localStorage.setItem('user', JSON.stringify(authUser));
      localStorage.setItem('token', 'next-auth-token');
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      if (status === 'unauthenticated') {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    setLoading(false);
  }, [session, status]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (!result || result.error) {
        throw new Error(result?.error || 'Login failed');
      }

      const session = await getSession();
      if (!session?.user) {
        throw new Error('Failed to retrieve authenticated session');
      }

      const authUser = normalizeUser(session.user);
      setUser(authUser);
      localStorage.setItem('user', JSON.stringify(authUser));
      localStorage.setItem('token', 'next-auth-token');
      setIsAuthenticated(true);
      return authUser;
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
  };
}
