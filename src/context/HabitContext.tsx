'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useHabits } from '@/hooks/useHabits';
import { useAllStreaks } from '@/hooks/useStreaks';
import { useCategories } from '@/hooks/useCategories';
import { Habit, StreakData, Category } from '@/types';

interface HabitContextType {
  habits: Habit[];
  streaks: Record<string, StreakData>;
  categories: Category[];
  loading: boolean;
  addHabit: (habitData: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>) => Promise<string>;
  updateHabit: (habitId: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  addCategory: (categoryData: Omit<Category, 'id' | 'order'>) => Promise<string>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export function HabitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { habits, loading: habitsLoading, addHabit: rawAddHabit, updateHabit: rawUpdateHabit, deleteHabit: rawDeleteHabit } = useHabits(user?.uid);
  const { streaks, loading: streaksLoading } = useAllStreaks(user?.uid);
  const { categories, loading: categoriesLoading, addCategory: rawAddCategory, deleteCategory: rawDeleteCategory } = useCategories(user?.uid);

  const value: HabitContextType = {
    habits,
    streaks,
    categories,
    loading: habitsLoading || streaksLoading || categoriesLoading,
    addHabit: rawAddHabit,
    updateHabit: rawUpdateHabit,
    deleteHabit: rawDeleteHabit,
    addCategory: rawAddCategory,
    deleteCategory: rawDeleteCategory,
  };

  return (
    <HabitContext.Provider value={value}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabitsContext() {
  const context = useContext(HabitContext);
  if (context === undefined) {
    throw new Error('useHabitsContext must be used within a HabitProvider');
  }
  return context;
}
