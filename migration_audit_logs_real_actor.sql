-- ============================================================================
-- MIGRATION & AUDIT LOG: REAL USER AUDITING FOR REPORTS STATUS CHANGE
-- Created: 2026-06-30
--
-- RETROACTIVE DATA LOGGING NOTE:
-- Existing 'PDR_USER' string logs in the audit_logs table cannot be mapped to 
-- actual users retroactively since actor_id was not captured historically. 
-- Historical 'PDR_USER' values will remain as is (data loss in user mapping 
-- is accepted). Moving forward, actor_id will link directly to auth.users.
-- ============================================================================

-- 1. Add actor_id foreign key column to audit_logs table
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Update trigger function to audit real logged-in user
CREATE OR REPLACE FUNCTION public.log_report_change()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    actor_name TEXT;
BEGIN
    -- Get current authenticated user UUID
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Resolve user display name/role or email for human-readability
        SELECT COALESCE(
            (raw_user_meta_data->>'name') || ' (' || COALESCE(raw_user_meta_data->>'role', 'Kullanıcı') || ')',
            email,
            'Kullanıcı (' || current_user_id::TEXT || ')'
        ) INTO actor_name
        FROM auth.users
        WHERE id = current_user_id;
    ELSE
        -- Fallback for service roles, cron jobs, etc.
        actor_name := 'SYSTEM';
    END IF;

    INSERT INTO public.audit_logs (log_id, action, actor_id, actor, status)
    VALUES (
        'LOG-' || FLOOR(RANDOM() * 9000 + 1000)::TEXT,
        'İhbar Durumu Güncellendi: ' || NEW.tracking_code,
        current_user_id,
        actor_name,
        'Başarılı'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create readable view for Denetim (Audit Logs) Screen
CREATE OR REPLACE VIEW public.audit_logs_readable WITH (security_invoker = true) AS
SELECT 
    l.id,
    l.log_id,
    l.action,
    l.actor_id,
    l.actor,
    l.status,
    l.created_at
FROM public.audit_logs l;

-- 4. Set up append-only RLS policies for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select audit_logs to authorized roles" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert audit_logs to public" ON public.audit_logs;

-- Read permission: Only PDR and Admin (School Principal) roles
CREATE POLICY "Allow select audit_logs to authorized roles" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('pdr', 'admin'));

-- Write permission: Allowed for public/authenticated systems to append logs
CREATE POLICY "Allow insert audit_logs to public" ON public.audit_logs
  FOR INSERT TO public WITH CHECK (true);
