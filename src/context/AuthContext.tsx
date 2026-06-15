'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getCurrentUserAction,
  signInAction,
  signUpAction,
  signOutAction,
} from '@/app/actions/auth';

interface AuthContextType {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string;
    accent?: string;
  } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateAccent: (accent: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Load active session on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUserAction() as any;
        setUser(currentUser);
        if (currentUser?.accent) {
          const { applyAccent } = await import('@/components/layout/ClientAccentLoader');
          applyAccent(currentUser.accent);
        }
      } catch (err) {
        console.error('Failed to load user session:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const signInWithGoogle = async () => {
    // For a fully local setup, we simulate Google Sign-in by logging in
    // as a local developer profile in the SQLite database.
    try {
      setLoading(true);
      const email = 'alex.hacker@example.com';
      const password = 'SuperSecretLocalPassword123!';
      const displayName = 'Alex Hacker';

      let res = await signInAction(email, password) as any;
      if (!res.success) {
        res = await signUpAction(email, password, displayName) as any;
      }
      
      if (!res.success) {
        throw new Error(res.error);
      }
      
      setUser(res.user);
      if (res.user.accent) {
        const { applyAccent } = await import('@/components/layout/ClientAccentLoader');
        applyAccent(res.user.accent);
      }
      // Dispatch database-update event to trigger reloads of data
      window.dispatchEvent(new Event('database-update'));
      return res.user;
    } catch (err) {
      console.error('Local Google Sign-In mock failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await signInAction(email, password) as any;
      if (!res.success) {
        throw new Error(res.error);
      }
      setUser(res.user);
      if (res.user.accent) {
        const { applyAccent } = await import('@/components/layout/ClientAccentLoader');
        applyAccent(res.user.accent);
      }
      window.dispatchEvent(new Event('database-update'));
      return res.user;
    } catch (err) {
      console.error('Sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const res = await signUpAction(email, password, displayName) as any;
      if (!res.success) {
        throw new Error(res.error);
      }
      setUser(res.user);
      if (res.user.accent) {
        const { applyAccent } = await import('@/components/layout/ClientAccentLoader');
        applyAccent(res.user.accent);
      }
      window.dispatchEvent(new Event('database-update'));
      return res.user;
    } catch (err) {
      console.error('Sign-up failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await signOutAction();
      setUser(null);
      window.dispatchEvent(new Event('database-update'));
    } catch (err) {
      console.error('Sign-out failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAccent = async (accent: string) => {
    if (!user) return;
    try {
      const { updateUserAccentAction } = await import('@/app/actions/auth');
      await updateUserAccentAction(accent);
      const { applyAccent } = await import('@/components/layout/ClientAccentLoader');
      applyAccent(accent);
      setUser((prev: any) => prev ? { ...prev, accent } : null);
    } catch (err) {
      console.error('Failed to update user accent in database:', err);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateAccent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
