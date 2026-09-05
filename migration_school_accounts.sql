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

-- 3. Grants for demo / public access
GRANT ALL ON public.schools TO authenticated, anon, service_role;
GRANT ALL ON public.school_accounts TO authenticated, anon, service_role;

-- 4. Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for schools" ON public.schools;
CREATE POLICY "Allow all for schools" ON public.schools FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for school_accounts" ON public.school_accounts;
CREATE POLICY "Allow all for school_accounts" ON public.school_accounts FOR ALL USING (true) WITH CHECK (true);
