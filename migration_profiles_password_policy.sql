-- ============================================================================
-- MIGRATION: PASSWORD SECURITY POLICY (BSG YÖNERGESI MD.9)
-- Created: 2026-06-30
--
-- This migration sets up password expiration tracking (password_changed_at)
-- and historical hash tracking to prevent reuse of the same password.
-- ============================================================================

-- 1. Create public.profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    last_password_hash TEXT -- Stores previous encrypted password hash to prevent reuse
);

-- Enable RLS on profiles (optional but recommended)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies: users can read and update their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Trigger function on auth.users to synchronize profiles and detect password changes
CREATE OR REPLACE FUNCTION public.handle_password_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile if not exists
    INSERT INTO public.profiles (id, email, role, password_changed_at)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'role', 'Kullanıcı'), 
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = NEW.email,
        role = COALESCE(NEW.raw_user_meta_data->>'role', public.profiles.role),
        -- If password was changed, update password_changed_at and store old password hash
        password_changed_at = CASE 
            WHEN OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN NOW()
            ELSE public.profiles.password_changed_at
        END,
        last_password_hash = CASE 
            WHEN OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN OLD.encrypted_password
            ELSE public.profiles.last_password_hash
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
CREATE TRIGGER on_auth_user_created_or_updated
    AFTER INSERT OR UPDATE OF encrypted_password ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_password_change();
