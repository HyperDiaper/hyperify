'use client';

import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StreakData } from '@/types';
import { isMockMode } from '@/lib/db';

/**
 * Subscribes to streak data for a specific habit in real-time.
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

    if (isMockMode) {
      const loadStreak = () => {
        const stored = localStorage.getItem(`mock-streaks-${userId}-${habitId}`);
        if (stored) {
          try {
            setStreak(JSON.parse(stored));
          } catch {
            setStreak(null);
          }
        } else {
          setStreak({
            currentStreak: 0,
            longestStreak: 0,
            lastCompletedDate: '',
            graceDaysEarned: 0,
            graceDaysUsed: 0,
            freezeAvailable: false,
            completionRate: 0,
          });
        }
        setLoading(false);
      };

      loadStreak();

      window.addEventListener('mock-db-update', loadStreak);
      return () => window.removeEventListener('mock-db-update', loadStreak);
    }

    setLoading(true);
    const streakRef = doc(db, 'users', userId, 'streaks', habitId);

    const unsubscribe = onSnapshot(
      streakRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setStreak(docSnap.data() as StreakData);
        } else {
          setStreak({
            currentStreak: 0,
            longestStreak: 0,
            lastCompletedDate: '',
            graceDaysEarned: 0,
            graceDaysUsed: 0,
            freezeAvailable: false,
            completionRate: 0,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching streak for habit ${habitId}:`, err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, habitId]);

  return { streak, loading };
}

/**
 * Subscribes to all streak documents for a user in real-time.
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

    if (isMockMode) {
      const loadAllStreaks = () => {
        const habitsStr = localStorage.getItem(`mock-habits-${userId}`) || '[]';
        try {
          const habits = JSON.parse(habitsStr) as any[];
          const map: Record<string, StreakData> = {};

          habits.forEach((h) => {
            const streakStr = localStorage.getItem(`mock-streaks-${userId}-${h.id}`);
            if (streakStr) {
              map[h.id] = JSON.parse(streakStr);
            }
          });
          setStreaks(map);
        } catch {
          setStreaks({});
        }
        setLoading(false);
      };

      loadAllStreaks();

      window.addEventListener('mock-db-update', loadAllStreaks);
      return () => window.removeEventListener('mock-db-update', loadAllStreaks);
    }

    setLoading(true);
    const streaksRef = collection(db, 'users', userId, 'streaks');

    const unsubscribe = onSnapshot(
      streaksRef,
      (snapshot) => {
        const streaksMap: Record<string, StreakData> = {};
        snapshot.forEach((doc) => {
          streaksMap[doc.id] = doc.data() as StreakData;
        });
        setStreaks(streaksMap);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching all streaks:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { streaks, loading };
}
