import Database from 'better-sqlite3';
import path from 'path';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { Category } from '@/types';

declare global {
  var sqliteDb: Database.Database | undefined;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'hyperify-local-secret-key-32-chars-long-or-more';

interface SessionData {
  userId: string;
  email: string;
  displayName: string;
}

function getDbConnection(): Database.Database {
  let dbPath = path.join(process.cwd(), 'hyperify.db');

  // Serverless checks (Netlify, Vercel, AWS Lambda)
  if (
    process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  ) {
    dbPath = '/tmp/hyperify.db';
  }

  try {
    const database = new Database(dbPath);
    database.pragma('foreign_keys = ON');
    return database;
  } catch (err) {
    console.error('Failed to open SQLite database:', err);
    throw err;
  }
}

// Reuse existing connection in dev HMR to avoid locking the sqlite file
export const db = globalThis.sqliteDb ?? getDbConnection();

if (process.env.NODE_ENV !== 'production') {
  globalThis.sqliteDb = db;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'health', name: 'Health', color: 'emerald', icon: 'Heart', order: 1 },
  { id: 'work', name: 'Work', color: 'violet', icon: 'Briefcase', order: 2 },
  { id: 'mind', name: 'Mind', color: 'cyan', icon: 'Brain', order: 3 },
  { id: 'fitness', name: 'Fitness', color: 'orange', icon: 'Dumbbell', order: 4 },
];

// Helper to decrypt session cookie
export function decryptSession(sessionVal: string): SessionData | null {
  try {
    const parts = sessionVal.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted) as SessionData;
  } catch (err) {
    return null;
  }
}

// Self-healing: Get user session and ensure they exist in the SQLite instance
export async function getUserIdFromSession(): Promise<string> {
  const cookieStore = await cookies();
  const session = cookieStore.get('hyperify_session')?.value;
  if (!session) throw new Error('Unauthorized');

  const sessionData = decryptSession(session);
  if (!sessionData) throw new Error('Unauthorized');

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(sessionData.userId);
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
      } catch (insertErr) {
        // Double-check if user was created by another request in the meantime
        const checkAgain = db.prepare('SELECT id FROM users WHERE id = ?').get(sessionData.userId);
        if (!checkAgain) {
          console.error('Self-healing database user check failed to reconstruct user:', insertErr);
          throw insertErr;
        }
      }
    }
  } catch (err) {
    console.error('Self-healing database user check failed:', err);
    throw err;
  }

  return sessionData.userId;
}

// Initialize schema (tables and indexes)
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      displayName TEXT,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      accent TEXT DEFAULT 'lime'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT,
      orderIndex INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT, -- nullable for optional categories
      type TEXT NOT NULL,
      target REAL,
      unit TEXT,
      gradient TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      orderIndex INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS completions (
      userId TEXT NOT NULL,
      habitId TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      value REAL,
      duration INTEGER,
      timestamp TEXT NOT NULL,
      PRIMARY KEY (userId, habitId, date),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS streaks (
      habitId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      currentStreak INTEGER DEFAULT 0,
      longestStreak INTEGER DEFAULT 0,
      lastCompletedDate TEXT,
      graceDaysEarned INTEGER DEFAULT 0,
      graceDaysUsed INTEGER DEFAULT 0,
      freezeAvailable INTEGER DEFAULT 0,
      completionRate REAL DEFAULT 0,
      FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_categories_userId ON categories(userId);
    CREATE INDEX IF NOT EXISTS idx_habits_userId ON habits(userId);
    CREATE INDEX IF NOT EXISTS idx_completions_habitId ON completions(habitId);
    CREATE INDEX IF NOT EXISTS idx_streaks_userId ON streaks(userId);
  `);

  // Migrate existing databases: check if habits table has category constraint as NOT NULL
  try {
    const tableInfo = db.prepare("PRAGMA table_info(habits)").all() as any[];
    const categoryCol = tableInfo.find((c) => c.name === 'category');
    if (categoryCol && categoryCol.notnull === 1) {
      db.transaction(() => {
        db.exec(`
          PRAGMA foreign_keys = OFF;
          
          CREATE TABLE habits_temp (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            type TEXT NOT NULL,
            target REAL,
            unit TEXT,
            gradient TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            archived INTEGER DEFAULT 0,
            orderIndex INTEGER NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL
          );
          
          INSERT INTO habits_temp (id, userId, name, description, category, type, target, unit, gradient, createdAt, archived, orderIndex)
          SELECT id, userId, name, description, category, type, target, unit, gradient, createdAt, archived, orderIndex FROM habits;
          
          DROP TABLE habits;
          
          ALTER TABLE habits_temp RENAME TO habits;
          
          PRAGMA foreign_keys = ON;
        `);
      })();
      console.log('Successfully migrated habits table to allow null categories.');
    }
  } catch (err) {
    console.error('Error during habits table migration:', err);
  }

  // Migrate users table: add accent column if missing
  try {
    const userTableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const accentCol = userTableInfo.find((c) => c.name === 'accent');
    if (!accentCol) {
      db.exec("ALTER TABLE users ADD COLUMN accent TEXT DEFAULT 'lime'");
      console.log('Successfully added accent column to users table.');
    }
  } catch (err) {
    console.error('Error migrating users table:', err);
  }
}

// Automatically initialize database
initDatabase();
