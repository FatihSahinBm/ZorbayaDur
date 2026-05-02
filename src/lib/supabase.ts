import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Sadece geçerli bir URL varsa client oluştur, aksi halde build sırasında hata vermesini engelle
export const supabase = (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
