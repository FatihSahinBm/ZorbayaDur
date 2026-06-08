-- Kademeli Kimlik Sistemi (Özellik 1) Geçiş Scripti
-- Lütfen bu komutları Supabase SQL Editor panelinde çalıştırın.

-- 1. Yeni kolonların eklenmesi
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS identity_level INT DEFAULT 1; 
-- 1: PDR'ye gizli, 2: açık

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS encrypted_identity TEXT;
-- AES-256 ile şifrelenmiş isim/sınıf bilgisi

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS identity_updated_at TIMESTAMPTZ;

-- 2. RLS Politikalarının tanımlanması (Örnek - Gerçek projede rol bazlı auth entegrasyonu ile kullanılır):
-- Seviye 1 (PDR'ye Gizli): Sadece pdr_role görebilir
-- Seviye 2 (Açık Bildirim): pdr_role + admin_role görebilir
-- NOT: Demo ortamında anonim erişimi engellememek için aşağıdakiler yorum satırı yapılmıştır.
-- ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read level 1 to PDR" ON public.reports FOR SELECT USING (identity_level = 1 AND auth.jwt() ->> 'role' = 'pdr');
-- CREATE POLICY "Allow read level 2 to PDR and Admin" ON public.reports FOR SELECT USING (identity_level = 2 AND auth.jwt() ->> 'role' IN ('pdr', 'admin'));
