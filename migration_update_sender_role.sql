-- Migration/Audit script to adjust constraints and prevent data loss.
-- 1. Alter check constraint of anonymous_messages to allow 'teacher' role
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_name = 'anonymous_messages_sender_role_check'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.anonymous_messages DROP CONSTRAINT anonymous_messages_sender_role_check;
    END IF;
    
    ALTER TABLE public.anonymous_messages 
        ADD CONSTRAINT anonymous_messages_sender_role_check 
        CHECK (sender_role IN ('student', 'pdr', 'teacher'));
END $$;

-- 2. Audit/Migrate data from legacy 'messages' table to 'anonymous_messages'
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
    ) THEN
        -- Safely copy legacy messages into anonymous_messages
        INSERT INTO public.anonymous_messages (id, report_id, session_token, sender_role, content, is_read, created_at)
        SELECT 
            m.id,
            m.report_id,
            COALESCE(r.session_token, 'system-migrated') AS session_token,
            m.sender_role,
            m.content,
            FALSE AS is_read,
            m.created_at
        FROM public.messages m
        LEFT JOIN public.reports r ON m.report_id = r.id
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Legacy messages data migrated successfully.';
    ELSE
        RAISE NOTICE 'No legacy messages table found. Data migration skipped.';
    END IF;
END $$;
