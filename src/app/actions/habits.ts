'use server';

import { getUserIdFromSession } from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { Habit } from '@/types';
import { calculateStreak } from '@/lib/utils';
import crypto from 'crypto';

export async function getHabitsAction(): Promise<any[]> {
  const userId = await getUserIdFromSession();

  try {
    const { data: rows, error } = await supabase
      .from('habits')
      .select('*')
      .eq('userId', userId)
      .eq('archived', 0)
      .order('orderIndex', { ascending: true });

    if (error) throw error;

    return (rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category,
      type: row.type,
      target: row.target !== null ? row.target : undefined,
      unit: row.unit || undefined,
      gradient: row.gradient,
      createdAt: row.createdAt, // Return raw ISO string, client hook will convert to mock Timestamp
      archived: row.archived === 1,
      order: row.orderIndex,
    }));
  } catch (err) {
    console.error('Error fetching habits:', err);
    return [];
  }
}

export async function addHabitAction(
  habitData: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>
): Promise<string> {
  const userId = await getUserIdFromSession();
  const habitId = `habit-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  try {
    // Get max order
    const { data: maxRow, error: maxErr } = await supabase
      .from('habits')
      .select('orderIndex')
      .eq('userId', userId)
      .order('orderIndex', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) throw maxErr;
    const nextOrder = (maxRow?.orderIndex || 0) + 1;

    // Validate category existence
    let verifiedCategory: string | null = null;
    if (habitData.category) {
      const { data: exists } = await supabase
        .from('categories')
        .select('id')
        .eq('id', habitData.category)
        .eq('userId', userId)
        .maybeSingle();
      if (exists) {
        verifiedCategory = habitData.category;
      }
    }

    // 1. Insert habit
    const { error: insertErr } = await supabase
      .from('habits')
      .insert({
        id: habitId,
        userId,
        name: habitData.name,
        description: habitData.description || '',
        category: verifiedCategory,
        type: habitData.type,
        target: habitData.target !== undefined ? habitData.target : null,
        unit: habitData.unit || '',
        gradient: habitData.gradient,
        createdAt,
        archived: 0,
        orderIndex: nextOrder,
      });

    if (insertErr) throw insertErr;

    // 2. Initialize blank streak
    const { error: streakErr } = await supabase
      .from('streaks')
      .insert({
        habitId,
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: '',
        graceDaysEarned: 0,
        graceDaysUsed: 0,
        freezeAvailable: 0,
        completionRate: 0.0,
      });

    if (streakErr) throw streakErr;

    return habitId;
  } catch (err) {
    console.error('Error in addHabitAction:', err);
    throw err;
  }
}

export async function updateHabitAction(habitId: string, updates: Partial<Habit>): Promise<void> {
  const userId = await getUserIdFromSession();

  try {
    // Fetch current habit
    const { data: current, error: findErr } = await supabase
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('userId', userId)
      .maybeSingle();

    if (findErr || !current) {
      console.warn(`Attempted to update non-existent habit: ${habitId}`);
      return;
    }

    // Build update dynamic parameters
    const supabaseUpdates: any = {};

    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.category !== undefined) {
      let verifiedCategory: string | null = null;
      if (updates.category) {
        const { data: exists } = await supabase
          .from('categories')
          .select('id')
          .eq('id', updates.category)
          .eq('userId', userId)
          .maybeSingle();
        if (exists) {
          verifiedCategory = updates.category;
        }
      }
      supabaseUpdates.category = verifiedCategory;
    }
    if (updates.type !== undefined) supabaseUpdates.type = updates.type;
    if (updates.target !== undefined) supabaseUpdates.target = updates.target !== undefined ? updates.target : null;
    if (updates.unit !== undefined) supabaseUpdates.unit = updates.unit;
    if (updates.gradient !== undefined) supabaseUpdates.gradient = updates.gradient;
    if (updates.archived !== undefined) supabaseUpdates.archived = updates.archived ? 1 : 0;
    if (updates.order !== undefined) supabaseUpdates.orderIndex = updates.order;

    if (Object.keys(supabaseUpdates).length > 0) {
      const { error: updateErr } = await supabase
        .from('habits')
        .update(supabaseUpdates)
        .eq('id', habitId)
        .eq('userId', userId);

      if (updateErr) throw updateErr;
    }

    // If type or target value changed, recalculate streak metrics
    if (updates.type !== undefined || updates.target !== undefined) {
      const habitType = updates.type || current.type;
      const targetValue = updates.target !== undefined ? updates.target : current.target;

      // Get completions
      const { data: compRows, error: compErr } = await supabase
        .from('completions')
        .select('date, completed, value, duration, timestamp')
        .eq('habitId', habitId)
        .eq('userId', userId);

      if (compErr) throw compErr;

      const completions = (compRows || []).map((c) => ({
        date: c.date,
        completed: c.completed === 1,
        value: c.value !== null ? c.value : undefined,
        duration: c.duration !== null ? c.duration : undefined,
        timestamp: {
          seconds: 0,
          nanoseconds: 0,
          toDate: () => new Date(c.timestamp),
        } as any,
      }));

      const streakData = calculateStreak(completions, habitType, targetValue);

      const { error: streakErr } = await supabase
        .from('streaks')
        .update({
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          lastCompletedDate: streakData.lastCompletedDate,
          graceDaysEarned: streakData.graceDaysEarned,
          graceDaysUsed: streakData.graceDaysUsed,
          freezeAvailable: streakData.freezeAvailable ? 1 : 0,
          completionRate: streakData.completionRate,
        })
        .eq('habitId', habitId)
        .eq('userId', userId);

      if (streakErr) throw streakErr;
    }
  } catch (err) {
    console.error('Error updating habit:', err);
    throw err;
  }
}

export async function deleteHabitAction(habitId: string): Promise<void> {
  const userId = await getUserIdFromSession();

  try {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('userId', userId);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting habit:', err);
    throw err;
  }
}
