-- ============================================================================
-- MIGRATION: EMERGENCY BREAK-GLASS BYPASS MECHANISM
-- Created: 2026-07-01
-- ============================================================================

-- Ensure pgcrypto extension is enabled for AES decryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create emergency_bypasses table (INSERT-only)
CREATE TABLE IF NOT EXISTS public.emergency_bypasses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    justification TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configure Row Level Security (RLS) for emergency_bypasses
ALTER TABLE public.emergency_bypasses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select to authorized roles" ON public.emergency_bypasses;
DROP POLICY IF EXISTS "Allow insert to authenticated roles" ON public.emergency_bypasses;

-- Read permission: Only PDR and School Management roles
CREATE POLICY "Allow select to authorized roles" ON public.emergency_bypasses
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' IN ('pdr', 'okul_yoneticisi', 'admin'));

-- Write permission: Allowed only for School Management roles to insert a bypass log
CREATE POLICY "Allow insert to authenticated roles" ON public.emergency_bypasses
    FOR INSERT TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' IN ('okul_yoneticisi', 'admin'));

-- 3. Create stored procedure decrypt_identity_emergency
CREATE OR REPLACE FUNCTION public.decrypt_identity_emergency(target_report_id UUID, justification TEXT)
RETURNS TEXT AS $$
DECLARE
    current_actor_id UUID;
    actor_name TEXT;
    encrypted_id_b64 TEXT;
    combined BYTEA;
    iv BYTEA;
    ciphertext BYTEA;
    decrypted_bytes BYTEA;
    decrypted_text TEXT;
    key_bytes BYTEA;
    log_id_val VARCHAR(20);
    user_role TEXT;
BEGIN
    -- Verify user role from JWT (Only school administrators/managers)
    user_role := auth.jwt() ->> 'role';
    IF user_role NOT IN ('okul_yoneticisi', 'admin') THEN
        RAISE EXCEPTION 'Yetkisiz işlem: Sadece okul yöneticileri acil durum yetkisini kullanabilir.';
    END IF;

    -- Verify justification is not empty
    IF justification IS NULL OR trim(justification) = '' THEN
        RAISE EXCEPTION 'Zorunlu yasal gerekçe boş bırakılamaz.';
    END IF;

    -- Verify current user is authenticated
    current_actor_id := auth.uid();
    IF current_actor_id IS NULL THEN
        RAISE EXCEPTION 'Bu işlem için giriş yapılması gereklidir.';
    END IF;

    -- Resolve actor name for audit logging
    SELECT COALESCE(
        (raw_user_meta_data->>'name') || ' (' || COALESCE(raw_user_meta_data->>'role', 'Kullanıcı') || ')',
        email,
        'Kullanıcı (' || current_actor_id::TEXT || ')'
    ) INTO actor_name
    FROM auth.users
    WHERE id = current_actor_id;

    -- Get the encrypted identity for the report
    SELECT encrypted_identity INTO encrypted_id_b64
    FROM public.reports
    WHERE id = target_report_id;

    IF encrypted_id_b64 IS NULL THEN
        RAISE EXCEPTION 'Bu ihbara ait şifreli kimlik bulunamadı.';
    END IF;

    -- Insert emergency bypass log
    INSERT INTO public.emergency_bypasses (report_id, actor_id, justification)
    VALUES (target_report_id, current_actor_id, justification);

    -- Insert audit log with CRITICAL_EMERGENCY_BYPASS action type
    log_id_val := 'LOG-' || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
    INSERT INTO public.audit_logs (log_id, action, actor_id, actor, status)
    VALUES (
        log_id_val,
        'CRITICAL_EMERGENCY_BYPASS: ' || target_report_id::TEXT,
        current_actor_id,
        actor_name,
        'Başarılı'
    );

    -- Decrypt the identity
    BEGIN
        -- Key used is the default fallback.
        key_bytes := 'zorbaya-dur-secret-key-12345678'::BYTEA;
        
        combined := decode(encrypted_id_b64, 'base64');
        iv := substring(combined from 1 for 16);
        ciphertext := substring(combined from 17);
        
        decrypted_bytes := decrypt_iv(ciphertext, key_bytes, iv, 'aes-cbc/pad:pkcs');
        decrypted_text := convert_from(decrypted_bytes, 'utf-8');
        
        RETURN decrypted_text;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Kimlik çözme hatası: Anahtar uyumsuz veya şifreli veri bozuk.';
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
