import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/src/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
}

const globalForSupabase = globalThis as unknown as { supabase: SupabaseClient<Database> | undefined }

export const supabase = globalForSupabase.supabase ?? createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

if (import.meta.env.DEV) globalForSupabase.supabase = supabase
