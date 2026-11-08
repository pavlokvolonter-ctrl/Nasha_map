import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true, якщо задано ключі Supabase; інакше працюємо в локальному режимі (localStorage) */
export const supabaseEnabled = Boolean(url && key);
/** true, якщо мапу можна лише переглядати без входу */
export const publicView = process.env.NEXT_PUBLIC_PUBLIC_VIEW === 'true';

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

/** Клієнт Supabase; кидає помилку, якщо ключі не задано (викликати лише в режимі Supabase) */
export function sb(): SupabaseClient {
  if (!supabase) throw new Error('Supabase не налаштовано');
  return supabase;
}
