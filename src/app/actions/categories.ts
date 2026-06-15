'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/sqlite';
import { Category } from '@/types';

const SESSION_SECRET = process.env.SESSION_SECRET || 'hyperify-local-secret-key-32-chars-long-or-more';

// Helper to get authenticated userId from session
async function getUserIdFromSession(): Promise<string> {
  const cookieStore = await cookies();
  const session = cookieStore.get('hyperify_session')?.value;
  if (!session) throw new Error('Unauthorized');

  try {
    const parts = session.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    throw new Error('Unauthorized');
  }
}

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
