'use client';

import { useState, useEffect } from 'react';
import { Completion, HabitType } from '@/types';
import {
  getCompletionsAction,
  saveCompletionAction,
} from '@/app/actions/completions';

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

    const loadCompletions = async () => {
      try {
        const data = await getCompletionsAction(habitId);
        const mappedList: Completion[] = data.map((c) => ({
          ...c,
          timestamp: toMockTimestamp(c.timestamp) as any,
        }));
        
        const map: Record<string, Completion> = {};
        mappedList.forEach((c) => {
          map[c.date] = c;
        });

        setCompletions(mappedList);
        setCompletionsMap(map);
      } catch (err: any) {
        console.error(`Error loading completions for habit ${habitId}:`, err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadCompletions();

    window.addEventListener('database-update', loadCompletions);
    return () => window.removeEventListener('database-update', loadCompletions);
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
    await saveCompletionAction(habitId, habitType, targetValue, dateStr, completed, value, duration);
    window.dispatchEvent(new Event('database-update'));
  };

  return {
    completions,
    completionsMap,
    loading,
    error,
    toggleCompletion,
  };
}
