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

    // Capture previous state for fallback rollback
    const prevCompletions = [...completions];
    const prevCompletionsMap = { ...completionsMap };

    // Create optimistic completion object
    const optimisticCompletion: Completion = {
      date: dateStr,
      completed,
      value: value !== undefined ? value : (completed ? targetValue : undefined),
      duration: duration,
      timestamp: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        toDate: () => new Date(),
      } as any,
    };

    // Update list state optimistically
    let updatedList = completions.filter((c) => c.date !== dateStr);
    if (completed) {
      updatedList.push(optimisticCompletion);
    }
    
    // Update map state optimistically
    const updatedMap = { ...completionsMap };
    if (completed) {
      updatedMap[dateStr] = optimisticCompletion;
    } else {
      delete updatedMap[dateStr];
    }

    setCompletions(updatedList);
    setCompletionsMap(updatedMap);

    // Dispatch custom events for other dashboard widgets to update instantly
    window.dispatchEvent(
      new CustomEvent('habit-toggle-optimistic', {
        detail: { habitId, completed },
      })
    );

    // Save in background
    try {
      await saveCompletionAction(habitId, habitType, targetValue, dateStr, completed, value, duration);
      window.dispatchEvent(new Event('database-update'));
    } catch (err) {
      console.error('Failed to save completion to SQLite database, rolling back:', err);
      setCompletions(prevCompletions);
      setCompletionsMap(prevCompletionsMap);
      window.dispatchEvent(
        new CustomEvent('habit-toggle-optimistic', {
          detail: { habitId, completed: !completed }, // rollback dashboard stats
        })
      );
    }
  };

  return {
    completions,
    completionsMap,
    loading,
    error,
    toggleCompletion,
  };
}
