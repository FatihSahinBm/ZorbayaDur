import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient<Database> | null = null;

try {
  if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
  }
} catch (error) {
  console.error("Supabase Client oluşturulamadı (Anahtar hatalı olabilir):", error);
}

export const supabase = supabaseClient;
