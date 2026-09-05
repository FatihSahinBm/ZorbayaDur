-- MIGRATION: Multi-Tenant & Admin System
-- 1. Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_code VARCHAR(20) NOT NULL UNIQUE,
    student_count INT DEFAULT 0,
    pdr_count INT DEFAULT 0,
    principal_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 2. Create school_users table to store generated credentials
CREATE TABLE IF NOT EXISTS public.school_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_plain VARCHAR(255) NOT NULL, -- Storing plain text for the Excel export requirement
    role VARCHAR(20) NOT NULL, -- 'student', 'pdr', 'principal'
    full_name VARCHAR(100),
    student_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 3. Update existing tables to add school_id
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- If pdr_working_hours or on_call_roster exists, add school_id
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pdr_working_hours') THEN
        ALTER TABLE public.pdr_working_hours ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'on_call_roster') THEN
        ALTER TABLE public.on_call_roster ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Recreate reports_summary_view to include school_id
DROP VIEW IF EXISTS public.reports_summary_view;
CREATE OR REPLACE VIEW public.reports_summary_view AS
SELECT 
    id,
    school_id,
    category,
    risk_level,
    status,
    assigned_role,
    created_at,
    deadline_at,
    CASE 
        WHEN status = 'Tamamlandı' THEN EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at))/3600
        ELSE NULL
    END AS resolution_time_hours
FROM public.reports;

GRANT SELECT ON public.reports_summary_view TO authenticated, anon, service_role;

-- 5. Enable RLS on new tables (Demo mode: allow all)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on schools" ON public.schools;
CREATE POLICY "Allow all on schools" ON public.schools FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all on school_users" ON public.school_users;
CREATE POLICY "Allow all on school_users" ON public.school_users FOR ALL USING (true);
