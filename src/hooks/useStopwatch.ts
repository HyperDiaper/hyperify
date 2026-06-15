'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface TimerState {
  isRunning: boolean;
  startTime: number; // timestamp
  elapsedBeforeStart: number; // in seconds
}

export function useStopwatch(habitId: string) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `habit-timer-${habitId}`;

  // Helper to load timer state from localStorage
  const loadState = useCallback((): TimerState | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as TimerState;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Helper to save timer state to localStorage
  const saveState = useCallback(
    (state: TimerState | null) => {
      if (typeof window === 'undefined') return;
      if (state === null) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(state));
      }
    },
    [storageKey]
  );

  // Initialize timer on mount or habitId change
  useEffect(() => {
    const state = loadState();
    if (state) {
      if (state.isRunning) {
        const totalElapsed = Math.floor((Date.now() - state.startTime) / 1000) + state.elapsedBeforeStart;
        setElapsedTime(totalElapsed);
        setIsRunning(true);
      } else {
        setElapsedTime(state.elapsedBeforeStart);
        setIsRunning(false);
      }
    } else {
      setElapsedTime(0);
      setIsRunning(false);
    }
  }, [habitId, loadState]);

  // Handle interval ticking when isRunning
  useEffect(() => {
    if (isRunning) {
      const state = loadState();
      const initialStartTime = state?.startTime || Date.now();
      const initialElapsed = state?.elapsedBeforeStart || 0;

      intervalRef.current = setInterval(() => {
        const total = Math.floor((Date.now() - initialStartTime) / 1000) + initialElapsed;
        setElapsedTime(total);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, loadState]);

  const start = useCallback(() => {
    if (isRunning) return;

    const now = Date.now();
    const state: TimerState = {
      isRunning: true,
      startTime: now,
      elapsedBeforeStart: elapsedTime,
    };
    saveState(state);
    setIsRunning(true);
  }, [isRunning, elapsedTime, saveState]);

  const pause = useCallback(() => {
    if (!isRunning) return;

    const state = loadState();
    const finalElapsed = state
      ? Math.floor((Date.now() - state.startTime) / 1000) + state.elapsedBeforeStart
      : elapsedTime;

    const newState: TimerState = {
      isRunning: false,
      startTime: 0,
      elapsedBeforeStart: finalElapsed,
    };
    saveState(newState);
    setElapsedTime(finalElapsed);
    setIsRunning(false);
  }, [isRunning, elapsedTime, loadState, saveState]);

  const reset = useCallback(
    (newSeconds = 0) => {
      saveState(null);
      setElapsedTime(newSeconds);
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
    [saveState]
  );

  return {
    elapsedTime,
    isRunning,
    start,
    pause,
    reset,
  };
}
