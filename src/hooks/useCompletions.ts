'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Completion, HabitType } from '@/types';
import { saveCompletion, isMockMode } from '@/lib/db';

export function useCompletions(
  userId: string | null | undefined,
  habitId: string | undefined,
  habitType?: HabitType,
  targetValue?: number
) {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [completionsMap, setCompletionsMap] = useState<Record<string, Completion>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !habitId) {
      setCompletions([]);
      setCompletionsMap({});
      setLoading(false);
      return;
    }

    if (isMockMode) {
      const loadCompletions = () => {
        const stored = localStorage.getItem(`mock-completions-${userId}-${habitId}`) || '[]';
        try {
          const list = JSON.parse(stored) as Completion[];
          const map: Record<string, Completion> = {};
          list.forEach((c) => {
            map[c.date] = c;
          });
          setCompletions(list);
          setCompletionsMap(map);
        } catch {
          setCompletions([]);
          setCompletionsMap({});
        }
        setLoading(false);
      };

      loadCompletions();

      window.addEventListener('mock-db-update', loadCompletions);
      return () => window.removeEventListener('mock-db-update', loadCompletions);
    }

    setLoading(true);
    const completionsRef = collection(db, 'users', userId, 'habits', habitId, 'completions');

    const unsubscribe = onSnapshot(
      completionsRef,
      (snapshot) => {
        const list: Completion[] = [];
        const map: Record<string, Completion> = {};
        snapshot.forEach((doc) => {
          const data = doc.data() as Completion;
          list.push(data);
          map[data.date] = data;
        });
        setCompletions(list);
        setCompletionsMap(map);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching completions for habit ${habitId}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, habitId]);

  const toggleCompletion = async (
    dateStr: string,
    completed: boolean,
    value?: number,
    duration?: number
  ) => {
    if (!userId || !habitId || !habitType) {
      throw new Error('Missing parameters to toggle completion');
    }
    return saveCompletion(userId, habitId, habitType, targetValue, dateStr, completed, value, duration);
  };

  return {
    completions,
    completionsMap,
    loading,
    error,
    toggleCompletion,
  };
}
