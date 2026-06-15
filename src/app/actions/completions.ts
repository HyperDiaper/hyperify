'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/sqlite';
import { Completion, StreakData, HabitType } from '@/types';
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

export async function getCompletionsAction(habitId: string): Promise<any[]> {
  const userId = await getUserIdFromSession();

  try {
    const rows = db.prepare(
      'SELECT date, completed, value, duration, timestamp FROM completions WHERE habitId = ? AND userId = ?'
    ).all(habitId, userId) as any[];

    return rows.map((row) => ({
      date: row.date,
      completed: row.completed === 1,
      value: row.value !== null ? row.value : undefined,
      duration: row.duration !== null ? row.duration : undefined,
      timestamp: row.timestamp, // client hook will wrap
    }));
  } catch (err) {
    console.error('Error fetching completions:', err);
    return [];
  }
}

export async function getStreaksAction(): Promise<Record<string, StreakData>> {
  const userId = await getUserIdFromSession();

  try {
    const rows = db.prepare(
      'SELECT habitId, currentStreak, longestStreak, lastCompletedDate, graceDaysEarned, graceDaysUsed, freezeAvailable, completionRate FROM streaks WHERE userId = ?'
    ).all(userId) as any[];

    const streaksMap: Record<string, StreakData> = {};
    rows.forEach((row) => {
      streaksMap[row.habitId] = {
        currentStreak: row.currentStreak,
        longestStreak: row.longestStreak,
        lastCompletedDate: row.lastCompletedDate,
        graceDaysEarned: row.graceDaysEarned,
        graceDaysUsed: row.graceDaysUsed,
        freezeAvailable: row.freezeAvailable === 1,
        completionRate: row.completionRate,
      };
    });

    return streaksMap;
  } catch (err) {
    console.error('Error fetching streaks:', err);
    return {};
  }
}

export async function saveCompletionAction(
  habitId: string,
  habitType: HabitType,
  targetValue: number | undefined,
  dateStr: string,
  completed: boolean,
  value?: number,
  duration?: number
): Promise<void> {
  const userId = await getUserIdFromSession();
  const timestamp = new Date().toISOString();

  db.transaction(() => {
    // 1. Delete/insert completion row
    if (!completed) {
      db.prepare(
        'DELETE FROM completions WHERE userId = ? AND habitId = ? AND date = ?'
      ).run(userId, habitId, dateStr);
    } else {
      // Use REPLACE INTO to update if already exists
      db.prepare(
        `REPLACE INTO completions (userId, habitId, date, completed, value, duration, timestamp)
         VALUES (?, ?, ?, 1, ?, ?, ?)`
      ).run(
        userId,
        habitId,
        dateStr,
        value !== undefined ? value : null,
        duration !== undefined ? duration : null,
        timestamp
      );
    }

    // 2. Fetch all completions for streak calculation
    const compRows = db.prepare(
      'SELECT date, completed, value, duration FROM completions WHERE habitId = ? AND userId = ?'
    ).all(habitId, userId) as any[];

    const completions = compRows.map((c) => ({
      date: c.date,
      completed: c.completed === 1,
      value: c.value !== null ? c.value : undefined,
      duration: c.duration !== null ? c.duration : undefined,
      timestamp: {
        seconds: 0,
        nanoseconds: 0,
        toDate: () => new Date(),
      } as any,
    }));

    // 3. Calculate streak
    const streakData = calculateStreak(completions, habitType, targetValue);

    // 4. Update streak table
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
  })();
}
