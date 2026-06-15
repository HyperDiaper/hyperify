'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category } from '@/types';
import { isMockMode, DEFAULT_CATEGORIES, addCategory, deleteCategory } from '@/lib/db';

export function useCategories(userId: string | null | undefined) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    if (isMockMode) {
      const loadCategories = () => {
        const stored = localStorage.getItem(`mock-categories-${userId}`);
        if (stored) {
          try {
            setCategories(JSON.parse(stored));
          } catch {
            setCategories(DEFAULT_CATEGORIES);
          }
        } else {
          // Seed mock categories on first load
          localStorage.setItem(`mock-categories-${userId}`, JSON.stringify(DEFAULT_CATEGORIES));
          setCategories(DEFAULT_CATEGORIES);
        }
        setLoading(false);
      };

      loadCategories();

      window.addEventListener('mock-db-update', loadCategories);
      return () => window.removeEventListener('mock-db-update', loadCategories);
    }

    setLoading(true);
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const q = query(categoriesRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setCategories(DEFAULT_CATEGORIES);
        } else {
          const list: Category[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as Category);
          });
          setCategories(list);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching categories:', err);
        setCategories(DEFAULT_CATEGORIES);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return {
    categories,
    loading,
    addCategory: (categoryData: Omit<Category, 'id' | 'order'>) => {
      if (!userId) throw new Error('User must be signed in to add categories');
      return addCategory(userId, categoryData);
    },
    deleteCategory: (categoryId: string) => {
      if (!userId) throw new Error('User must be signed in to delete categories');
      return deleteCategory(userId, categoryId);
    },
  };
}
