'use server';

import { getUserIdFromSession } from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { Completion, StreakData, HabitType } from '@/types';
import { calculateStreak } from '@/lib/utils';

export async function getCompletionsAction(habitId: string): Promise<any[]> {
  const userId = await getUserIdFromSession();

  try {
    const { data: rows, error } = await supabase
      .from('completions')
      .select('date, completed, value, duration, timestamp')
      .eq('habitId', habitId)
      .eq('userId', userId);

    if (error) throw error;

    return (rows || []).map((row) => ({
      date: row.date,
      completed: row.completed === 1,
      value: row.value !== null ? row.value : undefined,
      duration: row.duration !== null ? row.duration : undefined,
      timestamp: row.timestamp,
    }));
  } catch (err) {
    console.error('Error fetching completions:', err);
    return [];
  }
}

export async function getStreaksAction(): Promise<Record<string, StreakData>> {
  const userId = await getUserIdFromSession();

  try {
    const { data: rows, error } = await supabase
      .from('streaks')
      .select('habitId, currentStreak, longestStreak, lastCompletedDate, graceDaysEarned, graceDaysUsed, freezeAvailable, completionRate')
      .eq('userId', userId);

    if (error) throw error;

    const streaksMap: Record<string, StreakData> = {};
    (rows || []).forEach((row) => {
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

  try {
    // Validate habit existence
    const { data: habitExists, error: findErr } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('userId', userId)
      .maybeSingle();

    if (findErr || !habitExists) {
      console.warn(`Attempted to save completion for non-existent habit: ${habitId}`);
      return;
    }

    // 1. Delete/insert completion row
    if (!completed) {
      const { error: deleteErr } = await supabase
        .from('completions')
        .delete()
        .eq('userId', userId)
        .eq('habitId', habitId)
        .eq('date', dateStr);

      if (deleteErr) throw deleteErr;
    } else {
      const { error: upsertErr } = await supabase
        .from('completions')
        .upsert({
          userId,
          habitId,
          date: dateStr,
          completed: 1,
          value: value !== undefined ? value : null,
          duration: duration !== undefined ? duration : null,
          timestamp,
        });

      if (upsertErr) throw upsertErr;
    }

    // 2. Fetch all completions for streak calculation
    const { data: compRows, error: compErr } = await supabase
      .from('completions')
      .select('date, completed, value, duration')
      .eq('habitId', habitId)
      .eq('userId', userId);

    if (compErr) throw compErr;

    const completions = (compRows || []).map((c) => ({
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
    const { error: streakErr } = await supabase
      .from('streaks')
      .update({
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        lastCompletedDate: streakData.lastCompletedDate,
        graceDaysEarned: streakData.graceDaysEarned,
        graceDaysUsed: streakData.graceDaysUsed,
        freezeAvailable: streakData.freezeAvailable ? 1 : 0,
        completionRate: streakData.completionRate,
      })
      .eq('habitId', habitId)
      .eq('userId', userId);

    if (streakErr) throw streakErr;
  } catch (err) {
    console.error('Error saving completion:', err);
    throw err;
  }
}

export async function getTodayCompletionsAction(dateStr: string): Promise<Record<string, boolean>> {
  const userId = await getUserIdFromSession();

  try {
    const { data: rows, error } = await supabase
      .from('completions')
      .select('habitId, completed')
      .eq('userId', userId)
      .eq('date', dateStr);

    if (error) throw error;

    const map: Record<string, boolean> = {};
    (rows || []).forEach((row) => {
      map[row.habitId] = row.completed === 1;
    });
    return map;
  } catch (err) {
    console.error('Error fetching today completions:', err);
    return {};
  }
}

export async function getAllCompletionsAction(): Promise<Record<string, Completion[]>> {
  const userId = await getUserIdFromSession();

  try {
    const { data: rows, error } = await supabase
      .from('completions')
      .select('habitId, date, completed, value, duration, timestamp')
      .eq('userId', userId);

    if (error) throw error;

    const map: Record<string, Completion[]> = {};
    (rows || []).forEach((row) => {
      if (!map[row.habitId]) {
        map[row.habitId] = [];
      }
      map[row.habitId].push({
        date: row.date,
        completed: row.completed === 1,
        value: row.value !== null ? row.value : undefined,
        duration: row.duration !== null ? row.duration : undefined,
        timestamp: {
          seconds: 0,
          nanoseconds: 0,
          toDate: () => new Date(row.timestamp),
        } as any,
      });
    });
    return map;
  } catch (err) {
    console.error('Error fetching all completions:', err);
    return {};
  }
}
