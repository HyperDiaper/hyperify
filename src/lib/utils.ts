import { Completion, StreakData, HabitType } from '@/types';

export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDate(dateStr: string): Date {
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

export function getNDaysAgo(n: number, fromDate: Date = new Date()): string {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - n);
  return formatDate(date);
}

/**
 * Calculates streak metrics walking forward from the first completion to today.
 * Handles grace days (streak freezes) and calculates current/longest streaks.
 */
export function calculateStreak(
  completions: Completion[],
  habitType: HabitType,
  targetValue?: number
): StreakData {
  const activeCompletions = completions.filter((c) => {
    if (!c.completed) return false;
    if (habitType === 'quantitative' && targetValue !== undefined) {
      return (c.value || 0) >= targetValue;
    }
    if (habitType === 'duration' && targetValue !== undefined) {
      return (c.duration || 0) >= targetValue;
    }
    return true;
  });

  if (activeCompletions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      graceDaysEarned: 0,
      graceDaysUsed: 0,
      freezeAvailable: false,
      completionRate: 0,
    };
  }

  // Create a set of completed dates for O(1) lookup
  const completedDates = new Set(activeCompletions.map((c) => c.date));

  // Find the first completion date
  const sortedDates = Array.from(completedDates).sort();
  const firstDateStr = sortedDates[0];
  const lastCompletedDate = sortedDates[sortedDates.length - 1];

  const today = new Date();
  const todayStr = formatDate(today);

  let currentStreak = 0;
  let longestStreak = 0;
  let consecutiveCompletedDays = 0;
  let bankedGraceDays = 0;
  let graceDaysEarned = 0;
  let graceDaysUsed = 0;

  // Generate sequence of dates from firstDateStr to today
  const currentDate = parseDate(firstDateStr);
  const endDate = parseDate(todayStr);

  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    const isCompleted = completedDates.has(dateStr);

    if (isCompleted) {
      currentStreak++;
      consecutiveCompletedDays++;
      
      // Every 14 consecutive completed days earns 1 grace day (max 3 banked)
      if (consecutiveCompletedDays === 14) {
        if (bankedGraceDays < 3) {
          bankedGraceDays++;
          graceDaysEarned++;
        }
        consecutiveCompletedDays = 0; // Reset counter for the next grace day
      }
      
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      // It's not completed.
      if (dateStr === todayStr) {
        // Today is not completed yet, so we don't break the streak or apply grace days yet.
        // The streak remains at its current level.
      } else {
        // A past day was missed. Check if we can use a banked grace day.
        if (bankedGraceDays > 0) {
          bankedGraceDays--;
          graceDaysUsed++;
          currentStreak++; // Keep streak going (increments streak as per plan)
          consecutiveCompletedDays = 0; // Reset consecutive completion counter because this was a freeze
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          // No grace days available, streak is broken.
          currentStreak = 0;
          consecutiveCompletedDays = 0;
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate overall completion rate (ratio of completed days to total tracked days)
  const diffTime = Math.abs(endDate.getTime() - parseDate(firstDateStr).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const completionRate = completedDates.size / Math.max(1, diffDays);

  return {
    currentStreak,
    longestStreak,
    lastCompletedDate,
    graceDaysEarned,
    graceDaysUsed,
    freezeAvailable: bankedGraceDays > 0,
    completionRate,
  };
}

/**
 * Calculates a history map of dateStr -> streak length walking chronologically.
 */
export function calculateStreakHistory(
  completions: Completion[],
  habitType: HabitType,
  targetValue?: number
): Record<string, number> {
  const activeCompletions = completions.filter((c) => {
    if (!c.completed) return false;
    if (habitType === 'quantitative' && targetValue !== undefined) {
      return (c.value || 0) >= targetValue;
    }
    if (habitType === 'duration' && targetValue !== undefined) {
      return (c.duration || 0) >= targetValue;
    }
    return true;
  });

  const streakHistory: Record<string, number> = {};
  if (activeCompletions.length === 0) return streakHistory;

  const completedDates = new Set(activeCompletions.map((c) => c.date));
  const sortedDates = Array.from(completedDates).sort();
  const firstDateStr = sortedDates[0];

  const today = new Date();
  const todayStr = formatDate(today);

  let currentStreak = 0;
  let consecutiveCompletedDays = 0;
  let bankedGraceDays = 0;

  const currentDate = parseDate(firstDateStr);
  const endDate = parseDate(todayStr);

  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    const isCompleted = completedDates.has(dateStr);

    if (isCompleted) {
      currentStreak++;
      consecutiveCompletedDays++;
      
      if (consecutiveCompletedDays === 14) {
        if (bankedGraceDays < 3) bankedGraceDays++;
        consecutiveCompletedDays = 0;
      }
    } else {
      if (dateStr === todayStr) {
        // Today is not completed yet, streak remains active
      } else {
        if (bankedGraceDays > 0) {
          bankedGraceDays--;
          currentStreak++;
          consecutiveCompletedDays = 0;
        } else {
          currentStreak = 0;
          consecutiveCompletedDays = 0;
        }
      }
    }

    streakHistory[dateStr] = currentStreak;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return streakHistory;
}

