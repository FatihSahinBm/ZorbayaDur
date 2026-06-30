-- Anonim 2 Yönlü Mesajlaşma (Özellik 4) Geçiş Scripti
-- Lütfen bu komutları Supabase SQL Editor panelinde çalıştırın.

-- 1. reports tablosuna session_token kolonunun eklenmesi
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS session_token TEXT;

-- 2. anonymous_messages tablosunun oluşturulması
CREATE TABLE IF NOT EXISTS public.anonymous_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL, -- öğrencinin anonim tokeni
  sender_role TEXT CHECK (sender_role IN ('student', 'pdr', 'teacher')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security (RLS) Aktifleştirilmesi ve Politikalar
ALTER TABLE public.anonymous_messages ENABLE ROW LEVEL SECURITY;

-- Demo/Uygulama ortamı için RLS politikaları:
DROP POLICY IF EXISTS "Allow public read anonymous_messages" ON public.anonymous_messages;
DROP POLICY IF EXISTS "Allow public insert anonymous_messages" ON public.anonymous_messages;
DROP POLICY IF EXISTS "Allow public update anonymous_messages" ON public.anonymous_messages;

CREATE POLICY "Allow public read anonymous_messages" ON public.anonymous_messages
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert anonymous_messages" ON public.anonymous_messages
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update anonymous_messages" ON public.anonymous_messages
  FOR UPDATE TO public USING (true);
