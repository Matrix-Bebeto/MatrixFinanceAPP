import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Prevent multiple instances during HMR which causes Web Locks API errors
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined
}

export const supabase = globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseAnonKey)

if (import.meta.env.DEV) globalForSupabase.supabase = supabase
