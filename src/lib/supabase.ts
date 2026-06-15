import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const key = serviceKey || anonKey;

  if (!url || !key) {
    console.error(
      'Supabase env check:',
      'URL=', url || 'MISSING',
      'SERVICE_KEY=', serviceKey ? 'SET' : 'MISSING',
      'ANON_KEY=', anonKey ? 'SET' : 'MISSING',
    );
    throw new Error('Supabase credentials not configured. Check .env.local');
  }

  _supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _supabase;
}

// Default export for backward compatibility — use getSupabase() in server actions
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
