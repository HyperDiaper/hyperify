import { Timestamp } from 'firebase/firestore';

export type HabitType = 'boolean' | 'quantitative' | 'duration';

export type GradientKey =
  | 'gradient-volt-blue'
  | 'gradient-lime-emerald'
  | 'gradient-gold-rose'
  | 'gradient-cyan-blue'
  | 'gradient-sunset-orange'
  | 'gradient-electric-purple'
  | 'gradient-aurora-teal'
  | 'gradient-cyberpunk'
  | 'gradient-lavender-indigo'
  | 'gradient-monochrome';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order: number;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: HabitType;
  target?: number;
  unit?: string;
  gradient: GradientKey;
  createdAt: Timestamp;
  archived: boolean;
  order: number;
}

export interface Completion {
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number; // for quantitative habits
  duration?: number; // for duration habits, in seconds
  timestamp: Timestamp;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  graceDaysEarned: number;
  graceDaysUsed: number;
  freezeAvailable: boolean;
  completionRate: number; // 0 to 1
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
}
