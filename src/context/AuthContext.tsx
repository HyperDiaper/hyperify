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
  } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Load active session on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUserAction();
        setUser(currentUser);
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

      let loggedUser;
      try {
        loggedUser = await signInAction(email, password);
      } catch {
        // If user doesn't exist, sign up
        loggedUser = await signUpAction(email, password, displayName);
      }
      
      setUser(loggedUser);
      // Dispatch database-update event to trigger reloads of data
      window.dispatchEvent(new Event('database-update'));
      return loggedUser;
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
      const res = await signInAction(email, password);
      if (!res.success) {
        throw new Error(res.error);
      }
      setUser(res.user);
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
      const res = await signUpAction(email, password, displayName);
      if (!res.success) {
        throw new Error(res.error);
      }
      setUser(res.user);
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

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
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
