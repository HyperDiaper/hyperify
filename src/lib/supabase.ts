import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  // Prioritize server-only variables (which won't be inlined at build time by Next.js/Turbopack)
  let url = process.env.SUPABASE_URL || process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (url) {
    // Sanitize the URL in case it was copied with a trailing slash or '/rest/v1/' path
    url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  }

  if (!url || !key) {
    console.error(
      'Supabase env check →',
      'URL:', url ? 'SET' : 'MISSING',
      '| SERVICE_KEY:', serviceKey ? 'SET' : 'MISSING',
      '| ANON_KEY:', anonKey ? 'SET' : 'MISSING',
    );
    throw new Error('Supabase credentials not configured. Please add them to your Netlify Environment Variables.');
  }

  _supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _supabase;
}
