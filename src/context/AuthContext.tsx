'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signInWithGoogle as realSignInWithGoogle,
  signInWithEmail as realSignInWithEmail,
  signUpWithEmail as realSignUpWithEmail,
  signOut as realSignOut,
} from '@/lib/auth';

interface AuthContextType {
  user: any | null; // Allow mock user or Firebase User
  loading: boolean;
  signInWithGoogle: () => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if we are running in mock mode
const isMockMode =
  typeof window !== 'undefined' &&
  (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'placeholder');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      // Load mock user from localStorage
      const stored = localStorage.getItem('mock-user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
      return;
    }

    // Real Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Mock implementation of Auth functions
  const mockSignInWithGoogle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockUser = {
      uid: 'mock-google-user-id',
      email: 'alex.hacker@example.com',
      displayName: 'Alex Hacker',
      photoURL: null,
    };
    localStorage.setItem('mock-user', JSON.stringify(mockUser));
    setUser(mockUser);
    return mockUser;
  };

  const mockSignInWithEmail = async (email: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Check if user exists in mock database
    const usersStr = localStorage.getItem('mock-users-db') || '[]';
    const users = JSON.parse(usersStr) as any[];
    const found = users.find((u) => u.email === email && u.password === password);

    if (!found) {
      throw new Error('Invalid email or password (Mock Mode)');
    }

    const loggedUser = {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      photoURL: null,
    };
    localStorage.setItem('mock-user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  };

  const mockSignUpWithEmail = async (email: string, password: string, displayName: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const usersStr = localStorage.getItem('mock-users-db') || '[]';
    const users = JSON.parse(usersStr) as any[];

    if (users.some((u) => u.email === email)) {
      throw new Error('Email already in use (Mock Mode)');
    }

    const newUid = `mock-user-${Date.now()}`;
    const newUser = { uid: newUid, email, password, displayName };
    users.push(newUser);
    localStorage.setItem('mock-users-db', JSON.stringify(users));

    const loggedUser = {
      uid: newUid,
      email,
      displayName,
      photoURL: null,
    };
    localStorage.setItem('mock-user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  };

  const mockSignOut = async () => {
    localStorage.removeItem('mock-user');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle: isMockMode ? mockSignInWithGoogle : realSignInWithGoogle,
    signInWithEmail: isMockMode ? mockSignInWithEmail : realSignInWithEmail,
    signUpWithEmail: isMockMode ? mockSignUpWithEmail : realSignUpWithEmail,
    signOut: isMockMode ? mockSignOut : realSignOut,
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
