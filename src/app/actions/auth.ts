'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db, DEFAULT_CATEGORIES, decryptSession } from '@/lib/sqlite';

const SESSION_SECRET = process.env.SESSION_SECRET || 'hyperify-local-secret-key-32-chars-long-or-more';

interface SessionData {
  userId: string;
  email: string;
  displayName: string;
}

// Helper to encrypt session cookie
function encryptSession(data: SessionData): string {
  const iv = crypto.randomBytes(16);
  // Use first 32 chars of secret key
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
    let user = db.prepare('SELECT id, email, displayName, createdAt FROM users WHERE id = ?').get(sessionData.userId) as any;
    
    // Auto-reconstruct user if database was recycled/reset (e.g. serverless container swap on Netlify)
    if (!user) {
      const createdAt = new Date().toISOString();
      try {
        db.prepare(
          'INSERT INTO users (id, email, displayName, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?)'
        ).run(sessionData.userId, sessionData.email, sessionData.displayName, 'reconstructed_dummy_hash', createdAt);

        // Seed default categories
        const insertCategory = db.prepare(
          'INSERT INTO categories (id, userId, name, color, icon, orderIndex) VALUES (?, ?, ?, ?, ?, ?)'
        );

        db.transaction(() => {
          DEFAULT_CATEGORIES.forEach((cat, index) => {
            insertCategory.run(cat.id + '-' + sessionData.userId, sessionData.userId, cat.name, cat.color, cat.icon || '', index + 1);
          });
        })();

        user = {
          id: sessionData.userId,
          email: sessionData.email,
          displayName: sessionData.displayName,
          createdAt,
        };
      } catch (insertErr) {
        console.warn('Concurrent user auto-reconstruction handled:', insertErr);
        // Double-check if user was created by another request in the meantime
        user = db.prepare('SELECT id, email, displayName, createdAt FROM users WHERE id = ?').get(sessionData.userId) as any;
        if (!user) {
          throw insertErr;
        }
      }
    }

    return {
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: null,
      createdAt: user.createdAt,
    };
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
}

export async function signUpAction(email: string, password: string, displayName: string) {
  try {
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return { success: false, error: 'Email already in use' };
    }

    const userId = `user-${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();

    // Insert user
    db.prepare(
      'INSERT INTO users (id, email, displayName, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, email, displayName, passwordHash, createdAt);

    // Seed default categories
    const insertCategory = db.prepare(
      'INSERT INTO categories (id, userId, name, color, icon, orderIndex) VALUES (?, ?, ?, ?, ?, ?)'
    );

    db.transaction(() => {
      DEFAULT_CATEGORIES.forEach((cat, index) => {
        insertCategory.run(cat.id + '-' + userId, userId, cat.name, cat.color, cat.icon || '', index + 1);
      });
    })();

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
      },
    };
  } catch (err: any) {
    console.error('Sign up error:', err);
    return { success: false, error: err.message || 'An error occurred during registration' };
  }
}

export async function signInAction(email: string, password: string) {
  try {
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
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
