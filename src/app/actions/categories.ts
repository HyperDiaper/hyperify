'use server';

import { getUserIdFromSession } from '@/lib/sqlite';
import { getSupabase } from '@/lib/supabase';
import { Category } from '@/types';
import crypto from 'crypto';

export async function getCategoriesAction(): Promise<Category[]> {
  const userId = await getUserIdFromSession();
  
  try {
    const { data: rows, error } = await getSupabase()
      .from('categories')
      .select('id, name, color, icon, orderIndex')
      .eq('userId', userId)
      .order('orderIndex', { ascending: true });

    if (error) throw error;

    return (rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon || undefined,
      order: row.orderIndex,
    }));
  } catch (err) {
    console.error('Error in getCategoriesAction:', err);
    return [];
  }
}

export async function addCategoryAction(categoryData: Omit<Category, 'id' | 'order'>): Promise<string> {
  const userId = await getUserIdFromSession();
  const catId = `cat-${crypto.randomUUID()}`;

  try {
    // Get max order
    const { data: maxRow, error: maxErr } = await getSupabase()
      .from('categories')
      .select('orderIndex')
      .eq('userId', userId)
      .order('orderIndex', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) throw maxErr;
    const nextOrder = (maxRow?.orderIndex || 0) + 1;

    const { error: insertErr } = await getSupabase()
      .from('categories')
      .insert({
        id: catId,
        userId,
        name: categoryData.name,
        color: categoryData.color,
        icon: categoryData.icon || '',
        orderIndex: nextOrder,
      });

    if (insertErr) throw insertErr;

    return catId;
  } catch (err) {
    console.error('Error adding category:', err);
    throw err;
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<void> {
  const userId = await getUserIdFromSession();

  try {
    // 1. Find remaining categories (excluding the one being deleted)
    const { data: remaining, error: findErr } = await getSupabase()
      .from('categories')
      .select('id')
      .eq('userId', userId)
      .neq('id', categoryId)
      .order('orderIndex', { ascending: true });

    if (findErr) throw findErr;

    let fallbackCatId = `health-${userId}`;
    if (remaining && remaining.length > 0) {
      fallbackCatId = remaining[0].id;
    } else {
      // If no categories left, create a default health category
      fallbackCatId = `health-${userId}`;
      const { error: insertErr } = await getSupabase()
        .from('categories')
        .insert({
          id: fallbackCatId,
          userId,
          name: 'Health',
          color: 'emerald',
          icon: 'Heart',
          orderIndex: 1,
        });
      if (insertErr) throw insertErr;
    }

    // 2. Update all habits using this category to the fallback
    const { error: updateErr } = await getSupabase()
      .from('habits')
      .update({ category: fallbackCatId })
      .eq('category', categoryId)
      .eq('userId', userId);

    if (updateErr) throw updateErr;

    // 3. Delete the category
    const { error: deleteErr } = await getSupabase()
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('userId', userId);

    if (deleteErr) throw deleteErr;
  } catch (err) {
    console.error('Error deleting category:', err);
    throw err;
  }
}
