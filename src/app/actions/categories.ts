'use server';

import { db, getUserIdFromSession } from '@/lib/sqlite';
import { Category } from '@/types';
import crypto from 'crypto';

export async function getCategoriesAction(): Promise<Category[]> {
  const userId = await getUserIdFromSession();
  
  try {
    const rows = db.prepare(
      'SELECT id, name, color, icon, orderIndex FROM categories WHERE userId = ? ORDER BY orderIndex ASC'
    ).all(userId) as any[];

    return rows.map((row) => ({
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

  // Get max order
  const maxOrderRow = db.prepare('SELECT MAX(orderIndex) as maxOrder FROM categories WHERE userId = ?').get(userId) as any;
  const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;

  db.prepare(
    'INSERT INTO categories (id, userId, name, color, icon, orderIndex) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(catId, userId, categoryData.name, categoryData.color, categoryData.icon || '', nextOrder);

  return catId;
}

export async function deleteCategoryAction(categoryId: string): Promise<void> {
  const userId = await getUserIdFromSession();

  db.transaction(() => {
    // 1. Delete the category
    db.prepare('DELETE FROM categories WHERE id = ? AND userId = ?').run(categoryId, userId);

    // 2. Find fallback category
    const remainingCats = db.prepare(
      'SELECT id FROM categories WHERE userId = ? ORDER BY orderIndex ASC LIMIT 1'
    ).get(userId) as any;

    let fallbackCatId = `health-${userId}`;
    if (remainingCats) {
      fallbackCatId = remainingCats.id;
    } else {
      // If no categories left, create a default health category
      fallbackCatId = `health-${userId}`;
      db.prepare(
        'INSERT INTO categories (id, userId, name, color, icon, orderIndex) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(fallbackCatId, userId, 'Health', 'emerald', 'Heart', 1);
    }

    // 3. Update all habits using this category to the fallback
    db.prepare(
      'UPDATE habits SET category = ? WHERE category = ? AND userId = ?'
    ).run(fallbackCatId, categoryId, userId);
  })();
}
