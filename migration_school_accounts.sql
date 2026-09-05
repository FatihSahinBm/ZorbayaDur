-- MIGRATION: School Accounts & Prefix Architecture
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create or alter schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    student_count INT DEFAULT 0,
    pdr_count INT DEFAULT 0,
    admin_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Ensure code column exists, unique index, and backwards compatibility
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'code') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'school_code') THEN
            ALTER TABLE public.schools ADD COLUMN code VARCHAR(10);
            UPDATE public.schools SET code = SUBSTRING(school_code FROM 1 FOR 10) WHERE code IS NULL;
            ALTER TABLE public.schools ALTER COLUMN code SET NOT NULL;
        ELSE
            ALTER TABLE public.schools ADD COLUMN code VARCHAR(10) NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'admin_count') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'principal_count') THEN
            ALTER TABLE public.schools ADD COLUMN admin_count INT DEFAULT 0;
            UPDATE public.schools SET admin_count = principal_count WHERE admin_count IS NULL;
        ELSE
            ALTER TABLE public.schools ADD COLUMN admin_count INT DEFAULT 0;
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'teacher_count') THEN
        ALTER TABLE public.schools ADD COLUMN teacher_count INT DEFAULT 0;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_code ON public.schools(code);

-- 2. Create school_accounts table (Zero plain-text passwords in database)
CREATE TABLE IF NOT EXISTS public.school_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_code VARCHAR(30) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'ogrenci', 'pdr', 'mudur', 'ogretmen', 'meb'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_school_accounts_user_code ON public.school_accounts(user_code);
CREATE INDEX IF NOT EXISTS idx_school_accounts_school_id ON public.school_accounts(school_id);

-- 3. Data Isolation: Link reports table to schools to prevent cross-school leak
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_reports_school_id ON public.reports(school_id);

-- 4. Grants and Permissions
GRANT ALL ON public.schools TO authenticated, anon, service_role;
GRANT ALL ON public.school_accounts TO authenticated, service_role;
GRANT INSERT, UPDATE ON public.school_accounts TO anon;
REVOKE SELECT ON public.school_accounts FROM anon;

-- 5. Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for schools" ON public.schools;
CREATE POLICY "Allow all for schools" ON public.schools FOR ALL USING (true) WITH CHECK (true);

-- STRICT ANON ISOLATION: Zero SELECT policy for anon role on school_accounts
DROP POLICY IF EXISTS "Allow all for school_accounts" ON public.school_accounts;
DROP POLICY IF EXISTS "Allow anon select on school_accounts" ON public.school_accounts;
DROP POLICY IF EXISTS "Allow select for authenticated school_accounts" ON public.school_accounts;
DROP POLICY IF EXISTS "Allow insert for school_accounts" ON public.school_accounts;
DROP POLICY IF EXISTS "Allow update for school_accounts" ON public.school_accounts;

-- Authenticated and service_role can select; anon has NO SELECT policy
CREATE POLICY "Allow select for authenticated school_accounts" ON public.school_accounts FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "Allow insert for school_accounts" ON public.school_accounts FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
CREATE POLICY "Allow update for school_accounts" ON public.school_accounts FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- 6. Secure Authentication Function (Zero exposure of entire table to clients)
CREATE OR REPLACE FUNCTION public.get_school_account_for_auth(p_user_code text)
RETURNS TABLE (
    id UUID,
    school_id UUID,
    user_code VARCHAR,
    password_hash TEXT,
    role VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT sa.id, sa.school_id, sa.user_code, sa.password_hash, sa.role
    FROM public.school_accounts sa
    WHERE UPPER(sa.user_code) = UPPER(p_user_code)
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_account_for_auth(text) TO anon, authenticated, service_role;

