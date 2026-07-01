-- ============================================================================
-- MIGRATION: OKUL YÖNETİCİSİ PANEL & COLUMN-LEVEL RLS RESTRICTIONS
-- Created: 2026-06-30
-- ============================================================================

-- 1. Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop existing select policies on reports
DROP POLICY IF EXISTS "Allow select reports to authenticated" ON public.reports;
DROP POLICY IF EXISTS "Allow select reports to PDR only" ON public.reports;

-- Create SELECT policy allowing ONLY pdr to view reports table directly
CREATE POLICY "Allow select reports to PDR only" ON public.reports
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' = 'pdr');

-- 2. Create reports_summary_view (PII-free)
CREATE OR REPLACE VIEW public.reports_summary_view AS
SELECT 
    id,
    category,
    risk_level,
    status,
    assigned_role,
    created_at,
    deadline_at,
    -- Resolution duration in hours
    CASE 
        WHEN status = 'Tamamlandı' THEN EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at))/3600
        ELSE NULL
    END AS resolution_time_hours
FROM public.reports;

-- Grant access to the view
GRANT SELECT ON public.reports_summary_view TO authenticated;
GRANT SELECT ON public.reports_summary_view TO anon;

-- 3. Create RPC function for Case Status Inquiry with masked PII
CREATE OR REPLACE FUNCTION public.get_case_status_by_code(target_code text)
RETURNS jsonb AS $$
DECLARE
    user_role text;
    report_data record;
    logs_data jsonb;
BEGIN
    -- Verify user role from JWT, default to 'okul_yoneticisi' for demo/anonymous client requests
    user_role := COALESCE(auth.jwt() ->> 'role', 'okul_yoneticisi');
    IF user_role NOT IN ('pdr', 'okul_yoneticisi') THEN
        RAISE EXCEPTION 'Yetkisiz işlem';
    END IF;

    -- Query report safe details
    SELECT id, status, risk_level, category, created_at
    INTO report_data
    FROM public.reports
    WHERE tracking_code = target_code;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    -- Query audit logs for this report, masking actor
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'log_id', l.log_id,
                'action', l.action,
                'actor', CASE 
                    WHEN l.actor = 'SYSTEM' THEN 'Sistem'
                    ELSE 'PDR Yetkilisi'
                END,
                'status', l.status,
                'created_at', l.created_at
            )
        ),
        '[]'::jsonb
    ) INTO logs_data
    FROM public.audit_logs l
    WHERE l.action LIKE '%' || target_code || '%';

    RETURN jsonb_build_object(
        'found', true,
        'status', report_data.status,
        'risk_level', report_data.risk_level,
        'category', report_data.category,
        'created_at', report_data.created_at,
        'history', logs_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
