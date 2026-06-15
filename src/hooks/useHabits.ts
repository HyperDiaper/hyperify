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
      
      const tempId = `temp-${Date.now()}`;
      const optimisticHabit: Habit = {
        id: tempId,
        name: habitData.name,
        description: habitData.description,
        category: habitData.category,
        type: habitData.type,
        target: habitData.target,
        unit: habitData.unit,
        gradient: habitData.gradient,
        createdAt: toMockTimestamp(new Date().toISOString()) as any,
        archived: false,
        order: habits.length + 1,
      };

      // Set state optimistically
      setHabits((prev) => [...prev, optimisticHabit]);

      // Run action in background
      (async () => {
        try {
          const habitId = await addHabitAction(habitData);
          setHabits((prev) =>
            prev.map((h) => (h.id === tempId ? { ...h, id: habitId } : h))
          );
          window.dispatchEvent(new Event('database-update'));
        } catch (err) {
          console.error('Failed to add habit on SQLite database, rolling back:', err);
          setHabits((prev) => prev.filter((h) => h.id !== tempId));
        }
      })();

      return tempId;
    },
    updateHabit: async (habitId: string, updates: Partial<Habit>) => {
      if (!userId) throw new Error('User must be signed in to update habits');
      
      const prevHabits = [...habits];

      // Set state optimistically
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? ({ ...h, ...updates } as Habit) : h))
      );

      // Run action in background
      (async () => {
        try {
          const cleanUpdates = { ...updates };
          if (cleanUpdates.createdAt) {
            delete cleanUpdates.createdAt;
          }
          await updateHabitAction(habitId, cleanUpdates);
          window.dispatchEvent(new Event('database-update'));
        } catch (err) {
          console.error('Failed to update habit on SQLite database, rolling back:', err);
          setHabits(prevHabits);
        }
      })();
    },
    deleteHabit: async (habitId: string) => {
      if (!userId) throw new Error('User must be signed in to delete habits');
      
      const prevHabits = [...habits];

      // Set state optimistically
      setHabits((prev) => prev.filter((h) => h.id !== habitId));

      // Run action in background
      (async () => {
        try {
          await deleteHabitAction(habitId);
          window.dispatchEvent(new Event('database-update'));
        } catch (err) {
          console.error('Failed to delete habit on SQLite database, rolling back:', err);
          setHabits(prevHabits);
        }
      })();
    },
  };
}
