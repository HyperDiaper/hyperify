'use client';

import { useState, useEffect } from 'react';
import { StreakData } from '@/types';
import { getStreaksAction } from '@/app/actions/completions';

const defaultStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: '',
  graceDaysEarned: 0,
  graceDaysUsed: 0,
  freezeAvailable: false,
  completionRate: 0,
};

/**
 * Loads streak data for a specific habit from SQLite.
 */
export function useStreaks(userId: string | null | undefined, habitId: string | undefined) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !habitId) {
      setStreak(null);
      setLoading(false);
      return;
    }

    const loadStreak = async () => {
      try {
        const streaksMap = await getStreaksAction();
        setStreak(streaksMap[habitId] || defaultStreak);
      } catch (err) {
        console.error(`Error loading streak for habit ${habitId}:`, err);
        setStreak(defaultStreak);
      } finally {
        setLoading(false);
      }
    };

    loadStreak();

    window.addEventListener('database-update', loadStreak);
    return () => window.removeEventListener('database-update', loadStreak);
  }, [userId, habitId]);

  return { streak, loading };
}

/**
 * Loads all streak documents for a user from SQLite.
 */
export function useAllStreaks(userId: string | null | undefined) {
  const [streaks, setStreaks] = useState<Record<string, StreakData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStreaks({});
      setLoading(false);
      return;
    }

    const loadAllStreaks = async () => {
      try {
        const streaksMap = await getStreaksAction();
        setStreaks(streaksMap);
      } catch (err) {
        console.error('Error loading all streaks from SQLite:', err);
        setStreaks({});
      } finally {
        setLoading(false);
      }
    };

    loadAllStreaks();

    window.addEventListener('database-update', loadAllStreaks);
    return () => window.removeEventListener('database-update', loadAllStreaks);
  }, [userId]);

  return { streaks, loading };
}
