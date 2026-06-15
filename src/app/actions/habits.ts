'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/sqlite';
import { Habit, StreakData } from '@/types';
import { calculateStreak } from '@/lib/utils';

const SESSION_SECRET = process.env.SESSION_SECRET || 'hyperify-local-secret-key-32-chars-long-or-more';

// Helper to get authenticated userId from session
async function getUserIdFromSession(): Promise<string> {
  const cookieStore = await cookies();
  const session = cookieStore.get('hyperify_session')?.value;
  if (!session) throw new Error('Unauthorized');

  try {
    const parts = session.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    throw new Error('Unauthorized');
  }
}

export async function getHabitsAction(): Promise<any[]> {
  const userId = await getUserIdFromSession();

  try {
    const rows = db.prepare(
      'SELECT * FROM habits WHERE userId = ? AND archived = 0 ORDER BY orderIndex ASC'
    ).all(userId) as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category,
      type: row.type,
      target: row.target !== null ? row.target : undefined,
      unit: row.unit || undefined,
      gradient: row.gradient,
      createdAt: row.createdAt, // Return raw ISO string, client hook will convert to mock Timestamp
      archived: row.archived === 1,
      order: row.orderIndex,
    }));
  } catch (err) {
    console.error('Error fetching habits:', err);
    return [];
  }
}

export async function addHabitAction(
  habitData: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>
): Promise<string> {
  const userId = await getUserIdFromSession();
  const habitId = `habit-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  // Get max order
  const maxOrderRow = db.prepare('SELECT MAX(orderIndex) as maxOrder FROM habits WHERE userId = ?').get(userId) as any;
  const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;

  db.transaction(() => {
    // 1. Insert habit
    db.prepare(
      `INSERT INTO habits (id, userId, name, description, category, type, target, unit, gradient, createdAt, archived, orderIndex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      habitId,
      userId,
      habitData.name,
      habitData.description || '',
      habitData.category,
      habitData.type,
      habitData.target !== undefined ? habitData.target : null,
      habitData.unit || '',
      habitData.gradient,
      createdAt,
      nextOrder
    );

    // 2. Initialize blank streak
    db.prepare(
      `INSERT INTO streaks (habitId, userId, currentStreak, longestStreak, lastCompletedDate, graceDaysEarned, graceDaysUsed, freezeAvailable, completionRate)
       VALUES (?, ?, 0, 0, '', 0, 0, 0, 0.0)`
    ).run(habitId, userId);
  })();

  return habitId;
}

export async function updateHabitAction(habitId: string, updates: Partial<Habit>): Promise<void> {
  const userId = await getUserIdFromSession();

  db.transaction(() => {
    // Fetch current habit
    const current = db.prepare('SELECT * FROM habits WHERE id = ? AND userId = ?').get(habitId, userId) as any;
    if (!current) throw new Error('Habit not found');

    // Build update dynamic query
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.target !== undefined) {
      fields.push('target = ?');
      values.push(updates.target !== undefined ? updates.target : null);
    }
    if (updates.unit !== undefined) {
      fields.push('unit = ?');
      values.push(updates.unit);
    }
    if (updates.gradient !== undefined) {
      fields.push('gradient = ?');
      values.push(updates.gradient);
    }
    if (updates.archived !== undefined) {
      fields.push('archived = ?');
      values.push(updates.archived ? 1 : 0);
    }
    if (updates.order !== undefined) {
      fields.push('orderIndex = ?');
      values.push(updates.order);
    }

    if (fields.length > 0) {
      const query = `UPDATE habits SET ${fields.join(', ')} WHERE id = ? AND userId = ?`;
      values.push(habitId, userId);
      db.prepare(query).run(...values);
    }

    // If type or target value changed, recalculate streak metrics
    if (updates.type !== undefined || updates.target !== undefined) {
      const habitType = updates.type || current.type;
      const targetValue = updates.target !== undefined ? updates.target : current.target;

      // Get completions
      const compRows = db.prepare(
        'SELECT date, completed, value, duration, timestamp FROM completions WHERE habitId = ? AND userId = ?'
      ).all(habitId, userId) as any[];

      const completions = compRows.map((c) => ({
        date: c.date,
        completed: c.completed === 1,
        value: c.value !== null ? c.value : undefined,
        duration: c.duration !== null ? c.duration : undefined,
        timestamp: {
          seconds: 0,
          nanoseconds: 0,
          toDate: () => new Date(c.timestamp),
        } as any,
      }));

      const streakData = calculateStreak(completions, habitType, targetValue);

      db.prepare(
        `UPDATE streaks
         SET currentStreak = ?, longestStreak = ?, lastCompletedDate = ?, graceDaysEarned = ?, graceDaysUsed = ?, freezeAvailable = ?, completionRate = ?
         WHERE habitId = ? AND userId = ?`
      ).run(
        streakData.currentStreak,
        streakData.longestStreak,
        streakData.lastCompletedDate,
        streakData.graceDaysEarned,
        streakData.graceDaysUsed,
        streakData.freezeAvailable ? 1 : 0,
        streakData.completionRate,
        habitId,
        userId
      );
    }
  })();
}

export async function deleteHabitAction(habitId: string): Promise<void> {
  const userId = await getUserIdFromSession();

  // Due to ON DELETE CASCADE constraints, this will automatically delete completions and streaks
  db.prepare('DELETE FROM habits WHERE id = ? AND userId = ?').run(habitId, userId);
}
