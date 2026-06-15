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
      
      const tempId = `temp-cat-${Date.now()}`;
      const optimisticCategory: Category = {
        id: tempId,
        name: categoryData.name,
        color: categoryData.color,
        icon: categoryData.icon,
        order: categories.length + 1,
      };

      // Set state optimistically
      setCategories((prev) => [...prev, optimisticCategory]);

      // Run action in background
      (async () => {
        try {
          const catId = await addCategoryAction(categoryData);
          setCategories((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, id: catId } : c))
          );
          window.dispatchEvent(new Event('database-update'));
        } catch (err) {
          console.error('Failed to add category, rolling back:', err);
          setCategories((prev) => prev.filter((c) => c.id !== tempId));
        }
      })();

      return tempId;
    },
    deleteCategory: async (categoryId: string) => {
      if (!userId) throw new Error('User must be signed in to delete categories');
      
      const prevCategories = [...categories];

      // Set state optimistically
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));

      // Run action in background
      (async () => {
        try {
          await deleteCategoryAction(categoryId);
          window.dispatchEvent(new Event('database-update'));
        } catch (err) {
          console.error('Failed to delete category, rolling back:', err);
          setCategories(prevCategories);
        }
      })();
    },
  };
}
