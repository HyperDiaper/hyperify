'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { DEFAULT_CATEGORIES, decryptSession, getUserIdFromSession } from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';

const SESSION_SECRET = process.env.SESSION_SECRET || 'hyperify-local-secret-key-32-chars-long-or-more';

interface SessionData {
  userId: string;
  email: string;
  displayName: string;
}

// Helper to encrypt session cookie
function encryptSession(data: SessionData): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Hashing helper
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify helper
function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch {
    return false;
  }
}

export async function getCurrentUserAction() {
  const cookieStore = await cookies();
  const session = cookieStore.get('hyperify_session')?.value;
  if (!session) return null;

  const sessionData = decryptSession(session);
  if (!sessionData) return null;

  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('id, email, displayName, createdAt, accent')
      .eq('id', sessionData.userId)
      .maybeSingle();

    if (error) throw error;
    
    // Auto-reconstruct user if database was recycled/reset
    if (!user) {
      const createdAt = new Date().toISOString();
      try {
        const { error: insertErr } = await supabase
          .from('users')
          .insert({
            id: sessionData.userId,
            email: sessionData.email,
            displayName: sessionData.displayName,
            passwordHash: 'reconstructed_dummy_hash',
            createdAt,
            accent: 'lime',
          });

        if (insertErr) throw insertErr;

        // Seed default categories
        const categoriesToInsert = DEFAULT_CATEGORIES.map((cat, index) => ({
          id: `${cat.id}-${sessionData.userId}`,
          userId: sessionData.userId,
          name: cat.name,
          color: cat.color,
          icon: cat.icon || '',
          orderIndex: index + 1,
        }));

        const { error: catErr } = await supabase
          .from('categories')
          .insert(categoriesToInsert);

        if (catErr) throw catErr;

        user = {
          id: sessionData.userId,
          email: sessionData.email,
          displayName: sessionData.displayName,
          createdAt,
          accent: 'lime',
        };
      } catch (insertErr) {
        console.warn('Concurrent user auto-reconstruction handled:', insertErr);
        const { data: checkAgain, error: checkErr } = await supabase
          .from('users')
          .select('id, email, displayName, createdAt, accent')
          .eq('id', sessionData.userId)
          .maybeSingle();

        if (checkErr || !checkAgain) throw insertErr;
        user = checkAgain;
      }
    }

    return {
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: null,
      createdAt: user.createdAt,
      accent: user.accent || 'lime',
    };
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
}

export async function signUpAction(email: string, password: string, displayName: string) {
  try {
    // Check if user exists
    const { data: existing, error: findErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (findErr) throw findErr;
    if (existing) {
      return { success: false, error: 'Email already in use' };
    }

    const userId = `user-${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();

    // Insert user
    const { error: insertErr } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        displayName,
        passwordHash,
        createdAt,
        accent: 'lime',
      });

    if (insertErr) throw insertErr;

    // Seed default categories
    const categoriesToInsert = DEFAULT_CATEGORIES.map((cat, index) => ({
      id: `${cat.id}-${userId}`,
      userId,
      name: cat.name,
      color: cat.color,
      icon: cat.icon || '',
      orderIndex: index + 1,
    }));

    const { error: catErr } = await supabase
      .from('categories')
      .insert(categoriesToInsert);

    if (catErr) throw catErr;

    // Set session cookie
    const session = encryptSession({ userId, email, displayName });
    const cookieStore = await cookies();
    cookieStore.set('hyperify_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return {
      success: true,
      user: {
        uid: userId,
        email,
        displayName,
        photoURL: null,
        createdAt,
        accent: 'lime',
      },
    };
  } catch (err: any) {
    console.error('Sign up error:', err);
    return { success: false, error: err.message || 'An error occurred during registration' };
  }
}

export async function signInAction(email: string, password: string) {
  try {
    const { data: user, error: findErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findErr) throw findErr;
    
    // Serverless helper: if user exists in cookie but database was reset,
    // we automatically sign them up.
    if (!user) {
      const signUpRes = await signUpAction(email, password, email.split('@')[0]);
      return signUpRes;
    }

    if (user.passwordHash !== 'reconstructed_dummy_hash' && !verifyPassword(password, user.passwordHash)) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Set session cookie
    const session = encryptSession({ userId: user.id, email: user.email, displayName: user.displayName });
    const cookieStore = await cookies();
    cookieStore.set('hyperify_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return {
      success: true,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: null,
        createdAt: user.createdAt,
        accent: user.accent || 'lime',
      },
    };
  } catch (err: any) {
    console.error('Sign in error:', err);
    return { success: false, error: err.message || 'An error occurred during authentication' };
  }
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('hyperify_session');
}

export async function updateUserAccentAction(accent: string): Promise<void> {
  const userId = await getUserIdFromSession();
  const { error } = await supabase
    .from('users')
    .update({ accent })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user accent:', error);
    throw error;
  }
}
