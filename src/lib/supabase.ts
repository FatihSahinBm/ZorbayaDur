import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient = null;

try {
  if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
} catch (error) {
  console.error("Supabase Client oluşturulamadı (Anahtar hatalı olabilir):", error);
}

export const supabase = supabaseClient;
