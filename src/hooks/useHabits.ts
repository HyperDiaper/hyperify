'use client';

import { useState, useEffect } from 'react';
import { Habit } from '@/types';
import {
  getHabitsAction,
  addHabitAction,
  updateHabitAction,
  deleteHabitAction,
} from '@/app/actions/habits';

// Helper to convert ISO string to Firestore-like Timestamp
function toMockTimestamp(isoString: string) {
  const date = new Date(isoString);
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1e6,
    toDate: () => date,
    toString: () => isoString,
  };
}

export function useHabits(userId: string | null | undefined) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const loadHabits = async () => {
      try {
        const data = await getHabitsAction();
        const mappedHabits: Habit[] = data.map((h) => ({
          ...h,
          createdAt: toMockTimestamp(h.createdAt) as any,
        }));
        setHabits(mappedHabits);
      } catch (err: any) {
        console.error('Error loading habits from SQLite:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadHabits();

    window.addEventListener('database-update', loadHabits);
    return () => window.removeEventListener('database-update', loadHabits);
  }, [userId]);

  return {
    habits,
    loading,
    error,
    addHabit: async (habitData: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>) => {
      if (!userId) throw new Error('User must be signed in to add habits');
      const habitId = await addHabitAction(habitData);
      window.dispatchEvent(new Event('database-update'));
      return habitId;
    },
    updateHabit: async (habitId: string, updates: Partial<Habit>) => {
      if (!userId) throw new Error('User must be signed in to update habits');
      // Strip out complex objects if updates contains them
      const cleanUpdates = { ...updates };
      if (cleanUpdates.createdAt) {
        delete cleanUpdates.createdAt;
      }
      await updateHabitAction(habitId, cleanUpdates);
      window.dispatchEvent(new Event('database-update'));
    },
    deleteHabit: async (habitId: string) => {
      if (!userId) throw new Error('User must be signed in to delete habits');
      await deleteHabitAction(habitId);
      window.dispatchEvent(new Event('database-update'));
    },
  };
}
