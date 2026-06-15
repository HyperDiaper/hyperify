import { cookies } from 'next/headers';
import crypto from 'crypto';
import { Category } from '@/types';
import { getSupabase } from './supabase';

const SESSION_SECRET = process.env.SESSION_SECRET || 'hyperify-local-secret-key-32-chars-long-or-more';

interface SessionData {
  userId: string;
  email: string;
  displayName: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'health', name: 'Health', color: 'emerald', icon: 'Heart', order: 1 },
  { id: 'work', name: 'Work', color: 'violet', icon: 'Briefcase', order: 2 },
  { id: 'mind', name: 'Mind', color: 'cyan', icon: 'Brain', order: 3 },
  { id: 'fitness', name: 'Fitness', color: 'orange', icon: 'Dumbbell', order: 4 },
];

// Helper to decrypt session cookie
export function decryptSession(sessionVal: string): SessionData | null {
  try {
    const parts = sessionVal.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted) as SessionData;
  } catch (err) {
    return null;
  }
}

// Self-healing: Get user session and ensure they exist in the Supabase instance
export async function getUserIdFromSession(): Promise<string> {
  const cookieStore = await cookies();
  const session = cookieStore.get('hyperify_session')?.value;
  if (!session) throw new Error('Unauthorized');

  const sessionData = decryptSession(session);
  if (!sessionData) throw new Error('Unauthorized');

  try {
    const { data: user, error } = await getSupabase()
      .from('users')
      .select('id')
      .eq('id', sessionData.userId)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      const createdAt = new Date().toISOString();
      try {
        const { error: insertErr } = await getSupabase()
          .from('users')
          .insert({
            id: sessionData.userId,
            email: sessionData.email,
            displayName: sessionData.displayName,
            passwordHash: 'reconstructed_dummy_hash',
            createdAt,
            accent: 'lime',
          });

        if (insertErr) throw insertErr;

        // Seed default categories
        const categoriesToInsert = DEFAULT_CATEGORIES.map((cat, index) => ({
          id: `${cat.id}-${sessionData.userId}`,
          userId: sessionData.userId,
          name: cat.name,
          color: cat.color,
          icon: cat.icon || '',
          orderIndex: index + 1,
        }));

        const { error: catErr } = await getSupabase()
          .from('categories')
          .insert(categoriesToInsert);

        if (catErr) throw catErr;
      } catch (insertErr) {
        // Double-check if user was created by another request in the meantime
        const { data: checkAgain, error: checkErr } = await getSupabase()
          .from('users')
          .select('id')
          .eq('id', sessionData.userId)
          .maybeSingle();

        if (checkErr || !checkAgain) {
          console.error('Self-healing database user check failed to reconstruct user:', insertErr);
          throw insertErr;
        }
      }
    }
  } catch (err) {
    console.error('Self-healing database user check failed:', err);
    throw err;
  }

  return sessionData.userId;
}
