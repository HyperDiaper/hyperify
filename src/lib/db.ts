import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { calculateStreak } from './utils';
import { Habit, HabitType, Completion, StreakData, Category } from '@/types';

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'health', name: 'Health', color: 'emerald', icon: 'Heart', order: 1 },
  { id: 'work', name: 'Work', color: 'violet', icon: 'Briefcase', order: 2 },
  { id: 'mind', name: 'Mind', color: 'cyan', icon: 'Brain', order: 3 },
  { id: 'fitness', name: 'Fitness', color: 'orange', icon: 'Dumbbell', order: 4 },
];

export const isMockMode =
  typeof window !== 'undefined' &&
  (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'placeholder');

// Helper to trigger UI reload for mock database
const notifyMockDbUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mock-db-update'));
  }
};

/**
 * Adds a new habit to Firestore or Mock localStorage.
 */
export async function addHabit(
  userId: string,
  habitData: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>
): Promise<string> {
  if (isMockMode) {
    const habitsStr = localStorage.getItem(`mock-habits-${userId}`) || '[]';
    const habits = JSON.parse(habitsStr) as Habit[];
    
    const newId = `mock-habit-${Date.now()}`;
    const newHabit: Habit = {
      ...habitData,
      id: newId,
      createdAt: Timestamp.now(),
      archived: false,
      order: habits.length + 1,
    };
    
    habits.push(newHabit);
    localStorage.setItem(`mock-habits-${userId}`, JSON.stringify(habits));

    // Initialize streak
    const initialStreak: StreakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      graceDaysEarned: 0,
      graceDaysUsed: 0,
      freezeAvailable: false,
      completionRate: 0,
    };
    localStorage.setItem(`mock-streaks-${userId}-${newId}`, JSON.stringify(initialStreak));
    
    notifyMockDbUpdate();
    return newId;
  }

  const habitsRef = collection(db, 'users', userId, 'habits');
  const newHabitDoc = doc(habitsRef);
  
  const habitsSnap = await getDocs(habitsRef);
  const order = habitsSnap.size + 1;

  const habit: Habit = {
    ...habitData,
    id: newHabitDoc.id,
    createdAt: Timestamp.now(),
    archived: false,
    order,
  };

  await setDoc(newHabitDoc, habit);

  const streakRef = doc(db, 'users', userId, 'streaks', newHabitDoc.id);
  const initialStreak: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: '',
    graceDaysEarned: 0,
    graceDaysUsed: 0,
    freezeAvailable: false,
    completionRate: 0,
  };
  await setDoc(streakRef, initialStreak);

  return newHabitDoc.id;
}

/**
 * Updates an existing habit in Firestore or Mock localStorage.
 */
export async function updateHabit(
  userId: string,
  habitId: string,
  updates: Partial<Habit>
): Promise<void> {
  if (isMockMode) {
    const habitsStr = localStorage.getItem(`mock-habits-${userId}`) || '[]';
    let habits = JSON.parse(habitsStr) as Habit[];
    habits = habits.map((h) => (h.id === habitId ? { ...h, ...updates } : h));
    localStorage.setItem(`mock-habits-${userId}`, JSON.stringify(habits));

    // If type or target changed, resync streak
    if (updates.type !== undefined || updates.target !== undefined) {
      await syncStreak(userId, habitId, updates.type || 'boolean', updates.target);
    }
    
    notifyMockDbUpdate();
    return;
  }

  const habitRef = doc(db, 'users', userId, 'habits', habitId);
  await updateDoc(habitRef, updates);

  if (updates.type !== undefined || updates.target !== undefined) {
    const completionsRef = collection(db, 'users', userId, 'habits', habitId, 'completions');
    const completionsSnap = await getDocs(completionsRef);
    const completions: Completion[] = [];
    completionsSnap.forEach((doc) => {
      const data = doc.data();
      completions.push({
        date: data.date,
        completed: data.completed,
        value: data.value,
        duration: data.duration,
        timestamp: data.timestamp,
      });
    });

    const habitSnap = await getDocs(query(collection(db, 'users', userId, 'habits')));
    let habitObj: Habit | undefined;
    habitSnap.forEach((doc) => {
      if (doc.id === habitId) {
        habitObj = doc.data() as Habit;
      }
    });

    if (habitObj) {
      const streakData = calculateStreak(completions, habitObj.type, habitObj.target);
      const streakRef = doc(db, 'users', userId, 'streaks', habitId);
      await setDoc(streakRef, streakData);
    }
  }
}

/**
 * Deletes a habit and all associated completions/streaks.
 */
export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  if (isMockMode) {
    const habitsStr = localStorage.getItem(`mock-habits-${userId}`) || '[]';
    let habits = JSON.parse(habitsStr) as Habit[];
    habits = habits.filter((h) => h.id !== habitId);
    localStorage.setItem(`mock-habits-${userId}`, JSON.stringify(habits));

    localStorage.removeItem(`mock-streaks-${userId}-${habitId}`);
    localStorage.removeItem(`mock-completions-${userId}-${habitId}`);
    
    notifyMockDbUpdate();
    return;
  }

  await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
  await deleteDoc(doc(db, 'users', userId, 'streaks', habitId));

  const completionsRef = collection(db, 'users', userId, 'habits', habitId, 'completions');
  const completionsSnap = await getDocs(completionsRef);
  const deletePromises: Promise<void>[] = [];
  completionsSnap.forEach((doc) => {
    deletePromises.push(deleteDoc(doc.ref));
  });
  await Promise.all(deletePromises);
}

/**
 * Syncs the streak document based on all logged completions.
 */
export async function syncStreak(
  userId: string,
  habitId: string,
  habitType: HabitType,
  targetValue?: number
): Promise<StreakData> {
  if (isMockMode) {
    const compsStr = localStorage.getItem(`mock-completions-${userId}-${habitId}`) || '[]';
    const completions = JSON.parse(compsStr) as Completion[];
    
    const streakData = calculateStreak(completions, habitType, targetValue);
    localStorage.setItem(`mock-streaks-${userId}-${habitId}`, JSON.stringify(streakData));
    
    return streakData;
  }

  const completionsRef = collection(db, 'users', userId, 'habits', habitId, 'completions');
  const completionsSnap = await getDocs(completionsRef);

  const completions: Completion[] = [];
  completionsSnap.forEach((doc) => {
    const data = doc.data();
    completions.push({
      date: data.date,
      completed: data.completed,
      value: data.value,
      duration: data.duration,
      timestamp: data.timestamp,
    });
  });

  const streakData = calculateStreak(completions, habitType, targetValue);

  const streakRef = doc(db, 'users', userId, 'streaks', habitId);
  await setDoc(streakRef, streakData);

  return streakData;
}

/**
 * Logs a completion for a habit, then triggers a streak sync.
 */
export async function saveCompletion(
  userId: string,
  habitId: string,
  habitType: HabitType,
  targetValue: number | undefined,
  dateStr: string,
  completed: boolean,
  value?: number,
  duration?: number
): Promise<void> {
  if (isMockMode) {
    const compsStr = localStorage.getItem(`mock-completions-${userId}-${habitId}`) || '[]';
    let completions = JSON.parse(compsStr) as Completion[];
    
    // Remove if already exists for this date
    completions = completions.filter((c) => c.date !== dateStr);
    
    if (completed) {
      completions.push({
        date: dateStr,
        completed: true,
        value: value !== undefined ? value : undefined,
        duration: duration !== undefined ? duration : undefined,
        timestamp: Timestamp.now(),
      });
    }

    localStorage.setItem(`mock-completions-${userId}-${habitId}`, JSON.stringify(completions));
    
    // Sync streak
    await syncStreak(userId, habitId, habitType, targetValue);
    
    notifyMockDbUpdate();
    return;
  }

  const completionRef = doc(db, 'users', userId, 'habits', habitId, 'completions', dateStr);

  if (!completed) {
    await deleteDoc(completionRef);
  } else {
    await setDoc(completionRef, {
      date: dateStr,
      completed: true,
      value: value !== undefined ? value : null,
      duration: duration !== undefined ? duration : null,
      timestamp: Timestamp.now(),
    });
  }

  await syncStreak(userId, habitId, habitType, targetValue);
}

/**
 * Category CRUD operations.
 */
export async function addCategory(
  userId: string,
  categoryData: Omit<Category, 'id' | 'order'>
): Promise<string> {
  if (isMockMode) {
    const stored = localStorage.getItem(`mock-categories-${userId}`);
    const categories = stored ? JSON.parse(stored) : [...DEFAULT_CATEGORIES];

    const newId = `mock-cat-${Date.now()}`;
    const newCategory: Category = {
      ...categoryData,
      id: newId,
      order: categories.length + 1,
    };

    categories.push(newCategory);
    localStorage.setItem(`mock-categories-${userId}`, JSON.stringify(categories));
    notifyMockDbUpdate();
    return newId;
  }

  const categoriesRef = collection(db, 'users', userId, 'categories');
  const newDoc = doc(categoriesRef);
  const snap = await getDocs(categoriesRef);
  
  await setDoc(newDoc, {
    ...categoryData,
    id: newDoc.id,
    order: snap.size + 1 + DEFAULT_CATEGORIES.length,
  });
  return newDoc.id;
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  if (isMockMode) {
    const stored = localStorage.getItem(`mock-categories-${userId}`);
    let categories = stored ? JSON.parse(stored) : [...DEFAULT_CATEGORIES];
    categories = categories.filter((c: Category) => c.id !== categoryId);
    localStorage.setItem(`mock-categories-${userId}`, JSON.stringify(categories));
    
    // Cascade update habits that were using this category in mock local storage
    const habitsStr = localStorage.getItem(`mock-habits-${userId}`) || '[]';
    let habits = JSON.parse(habitsStr) as Habit[];
    let changed = false;
    habits = habits.map((h) => {
      if (h.category === categoryId) {
        changed = true;
        const fallback = categories[0]?.id || 'health';
        return { ...h, category: fallback };
      }
      return h;
    });
    if (changed) {
      localStorage.setItem(`mock-habits-${userId}`, JSON.stringify(habits));
    }

    notifyMockDbUpdate();
    return;
  }

  // Real Firestore delete
  await deleteDoc(doc(db, 'users', userId, 'categories', categoryId));

  // Find and update habits using this category in Firestore
  const habitsRef = collection(db, 'users', userId, 'habits');
  const habitsSnap = await getDocs(habitsRef);
  
  // Find fallback category (first from custom collection or default 'health')
  const categoriesRef = collection(db, 'users', userId, 'categories');
  const categoriesSnap = await getDocs(categoriesRef);
  let fallback = 'health';
  if (!categoriesSnap.empty) {
    const firstCustomCat = categoriesSnap.docs[0].data() as Category;
    if (firstCustomCat.id !== categoryId) {
      fallback = firstCustomCat.id;
    } else if (categoriesSnap.docs.length > 1) {
      fallback = (categoriesSnap.docs[1].data() as Category).id;
    }
  }

  const updatePromises: Promise<void>[] = [];
  habitsSnap.forEach((doc) => {
    const data = doc.data() as Habit;
    if (data.category === categoryId) {
      updatePromises.push(updateDoc(doc.ref, { category: fallback }));
    }
  });
  await Promise.all(updatePromises);
}
