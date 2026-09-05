-- ============================================================================
-- KOZA: School Isolation, Security Invoker & Strict RLS Migration
-- ============================================================================

-- 1. reports_summary_view UNRESTRICTED Uyarısını Kaldırma (Security Invoker)
ALTER VIEW public.reports_summary_view SET (security_invoker = true);

-- 2. NULL school_id İhbarlarını İlk Okula Bağlama ve NOT NULL Kısıtlaması
DO $$ 
DECLARE 
    default_school_id UUID; 
BEGIN 
    SELECT id INTO default_school_id FROM public.schools ORDER BY created_at ASC LIMIT 1; 
    
    IF default_school_id IS NOT NULL THEN 
        UPDATE public.reports 
        SET school_id = default_school_id 
        WHERE school_id IS NULL; 
    END IF; 
END $$;

ALTER TABLE public.reports ALTER COLUMN school_id SET NOT NULL;

-- 3. Mükerrer school_users Tablosunu Kaldırma
DROP TABLE IF EXISTS public.school_users CASCADE;

-- 4. Audit Log Tetikleyicisi (school_id Desteği)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs(school_id);

CREATE OR REPLACE FUNCTION public.log_report_change()
RETURNS TRIGGER AS $$ 
BEGIN 
    INSERT INTO public.audit_logs (log_id, action, actor, actor_id, school_id, status) 
    VALUES ( 
        'LOG-' || floor(random() * 9000 + 1000)::text, 
        'İhbar Durumu Güncellendi: ' || NEW.tracking_code, 
        COALESCE(auth.role(), 'PDR_USER'), 
        auth.uid(), 
        NEW.school_id, 
        'Başarılı' 
    ); 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_report_change ON public.reports;
CREATE TRIGGER tr_log_report_change
    AFTER UPDATE OF status ON public.reports
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.log_report_change();

-- 5. Gerçek Güvenlik: Katı RLS Politikaları
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Eski güvensiz politikaları temizle
DROP POLICY IF EXISTS "Allow public inserts to reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public read reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public update reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public delete reports" ON public.reports;
DROP POLICY IF EXISTS "Allow insert audit_logs to public" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow select audit_logs to public" ON public.audit_logs;

-- Yalnızca anonim ihbar gönderimine izin ver (Öğrenci form doldurabilsin)
CREATE POLICY "Allow public insert only to reports" ON public.reports 
    FOR INSERT TO public WITH CHECK (true);

-- İhbar okuma ve güncellemeyi 'public' rolüne TAMAMEN KAPAT.
-- Bu verileri yalnızca sunucu tarafı (Server Action / API Route üzerinden service_role ile) okuyabilsin.
