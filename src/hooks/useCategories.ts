'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/types';
import {
  getCategoriesAction,
  addCategoryAction,
  deleteCategoryAction,
} from '@/app/actions/categories';

export function useCategories(userId: string | null | undefined) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const loadCategories = async () => {
      try {
        const data = await getCategoriesAction();
        setCategories(data);
      } catch (err) {
        console.error('Error loading categories from SQLite:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();

    window.addEventListener('database-update', loadCategories);
    return () => window.removeEventListener('database-update', loadCategories);
  }, [userId]);

  return {
    categories,
    loading,
    addCategory: async (categoryData: Omit<Category, 'id' | 'order'>) => {
      if (!userId) throw new Error('User must be signed in to add categories');
      const catId = await addCategoryAction(categoryData);
      window.dispatchEvent(new Event('database-update'));
      return catId;
    },
    deleteCategory: async (categoryId: string) => {
      if (!userId) throw new Error('User must be signed in to delete categories');
      await deleteCategoryAction(categoryId);
      window.dispatchEvent(new Event('database-update'));
    },
  };
}
