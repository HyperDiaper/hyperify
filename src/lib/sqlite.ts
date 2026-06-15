import Database from 'better-sqlite3';
import path from 'path';

declare global {
  var sqliteDb: Database.Database | undefined;
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

import { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'health', name: 'Health', color: 'emerald', icon: 'Heart', order: 1 },
  { id: 'work', name: 'Work', color: 'violet', icon: 'Briefcase', order: 2 },
  { id: 'mind', name: 'Mind', color: 'cyan', icon: 'Brain', order: 3 },
  { id: 'fitness', name: 'Fitness', color: 'orange', icon: 'Dumbbell', order: 4 },
];

// Initialize schema (tables and indexes)
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      displayName TEXT,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
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
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      target REAL,
      unit TEXT,
      gradient TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      orderIndex INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category) REFERENCES categories(id) ON DELETE CASCADE
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
}

// Automatically initialize database
initDatabase();
