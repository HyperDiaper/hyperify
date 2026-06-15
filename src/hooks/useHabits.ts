'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Habit } from '@/types';
import { addHabit, updateHabit, deleteHabit, isMockMode } from '@/lib/db';

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

    if (isMockMode) {
      const loadHabits = () => {
        const stored = localStorage.getItem(`mock-habits-${userId}`) || '[]';
        try {
          setHabits(JSON.parse(stored));
        } catch {
          setHabits([]);
        }
        setLoading(false);
      };

      loadHabits();

      window.addEventListener('mock-db-update', loadHabits);
      return () => window.removeEventListener('mock-db-update', loadHabits);
    }

    setLoading(true);
    const habitsRef = collection(db, 'users', userId, 'habits');
    const q = query(habitsRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const habitsList: Habit[] = [];
        snapshot.forEach((doc) => {
          habitsList.push(doc.data() as Habit);
        });
        setHabits(habitsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching habits:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return {
    habits,
    loading,
    error,
    addHabit: (habitData: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>) => {
      if (!userId) throw new Error('User must be signed in to add habits');
      return addHabit(userId, habitData);
    },
    updateHabit: (habitId: string, updates: Partial<Habit>) => {
      if (!userId) throw new Error('User must be signed in to update habits');
      return updateHabit(userId, habitId, updates);
    },
    deleteHabit: (habitId: string) => {
      if (!userId) throw new Error('User must be signed in to delete habits');
      return deleteHabit(userId, habitId);
    },
  };
}
