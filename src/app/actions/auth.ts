'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/sqlite';
import { DEFAULT_CATEGORIES } from '@/lib/db';

const SESSION_SECRET = process.env.SESSION_SECRET || 'hyperify-local-secret-key-32-chars-long-or-more';

// Helper to encrypt session cookie
function encryptSession(userId: string): string {
  const iv = crypto.randomBytes(16);
  // Use first 32 chars of secret key
  const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(userId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Helper to decrypt session cookie
function decryptSession(sessionVal: string): string | null {
  try {
    const parts = sessionVal.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
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

  const userId = decryptSession(session);
  if (!userId) return null;

  try {
    const user = db.prepare('SELECT id, email, displayName, createdAt FROM users WHERE id = ?').get(userId) as any;
    if (!user) return null;
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
  // Check if user exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('Email already in use');
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
  const session = encryptSession(userId);
  const cookieStore = await cookies();
  cookieStore.set('hyperify_session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return {
    uid: userId,
    email,
    displayName,
    photoURL: null,
    createdAt,
  };
}

export async function signInAction(email: string, password: string) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid email or password');
  }

  // Set session cookie
  const session = encryptSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set('hyperify_session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return {
    uid: user.id,
    email: user.email,
    displayName: user.displayName,
    photoURL: null,
    createdAt: user.createdAt,
  };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('hyperify_session');
}
