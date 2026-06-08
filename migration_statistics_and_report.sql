-- İstatistikler, Form UX ve Yönetim Paneli (Özellik 5, 6, 7) Geçiş Scripti
-- Lütfen bu komutları Supabase SQL Editor panelinde çalıştırın.

-- 1. reports tablosuna konum, sıklık ve yönetim paylaşım onayı kolonlarının eklenmesi
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS identity_sharing_approved BOOLEAN DEFAULT FALSE;
