-- ============================================================================
-- MIGRATION: CRITICAL ESCALATION SYSTEM & WORKING HOURS
-- Created: 2026-06-30
-- ============================================================================

-- 1. Create pdr_working_hours table
CREATE TABLE IF NOT EXISTS public.pdr_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Pzt, 7=Paz
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_hours_limit INT DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default working hours (Monday-Friday 09:00 to 15:00 = 6 hours/day * 5 days = 30 hours total)
INSERT INTO public.pdr_working_hours (day_of_week, start_time, end_time) VALUES
(1, '09:00:00', '15:00:00'),
(2, '09:00:00', '15:00:00'),
(3, '09:00:00', '15:00:00'),
(4, '09:00:00', '15:00:00'),
(5, '09:00:00', '15:00:00')
ON CONFLICT DO NOTHING;

-- 2. Create on_call_roster table
CREATE TABLE IF NOT EXISTS public.on_call_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    assigned_name TEXT NOT NULL,
    contact_channel TEXT NOT NULL CHECK (contact_channel IN ('email', 'sms', 'push')),
    contact_address TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    escalation_target_name TEXT,
    escalation_contact_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roster duty
INSERT INTO public.on_call_roster (day_of_week, start_time, end_time, assigned_name, contact_channel, contact_address, escalation_target_name, escalation_contact_address) VALUES
(1, '00:00:00', '23:59:59', 'Müdür Yrd. Mehmet Gök', 'email', 'mehmet.gok@school.edu.tr', 'Müdür Ahmet Yıldız', 'ahmet.yildiz@school.edu.tr'),
(2, '00:00:00', '23:59:59', 'Müdür Yrd. Mehmet Gök', 'email', 'mehmet.gok@school.edu.tr', 'Müdür Ahmet Yıldız', 'ahmet.yildiz@school.edu.tr'),
(3, '00:00:00', '23:59:59', 'Müdür Yrd. Mehmet Gök', 'email', 'mehmet.gok@school.edu.tr', 'Müdür Ahmet Yıldız', 'ahmet.yildiz@school.edu.tr'),
(4, '00:00:00', '23:59:59', 'Müdür Yrd. Mehmet Gök', 'email', 'mehmet.gok@school.edu.tr', 'Müdür Ahmet Yıldız', 'ahmet.yildiz@school.edu.tr'),
(5, '00:00:00', '23:59:59', 'Müdür Yrd. Mehmet Gök', 'email', 'mehmet.gok@school.edu.tr', 'Müdür Ahmet Yıldız', 'ahmet.yildiz@school.edu.tr'),
(6, '00:00:00', '23:59:59', 'Nöbetçi Müdür Yrd. Fatma Şen', 'email', 'fatma.sen@school.edu.tr', 'Müdür Ahmet Yıldız', 'ahmet.yildiz@school.edu.tr'),
(7, '00:00:00', '23:59:59', 'Nöbetçi Müdür Yrd. Fatma Şen', 'email', 'fatma.sen@school.edu.tr', 'Müdür Ahmet Yıldız', 'ahmet.yildiz@school.edu.tr')
ON CONFLICT DO NOTHING;

-- 3. Create escalations log/track table
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    roster_id UUID REFERENCES public.on_call_roster(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    escalated_to_backup BOOLEAN DEFAULT FALSE,
    backup_escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pdr_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.on_call_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- Allow select to everyone
DROP POLICY IF EXISTS "Allow select working hours to authenticated" ON public.pdr_working_hours;
CREATE POLICY "Allow select working hours to authenticated" ON public.pdr_working_hours FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select roster to authenticated" ON public.on_call_roster;
CREATE POLICY "Allow select roster to authenticated" ON public.on_call_roster FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select escalations to authenticated" ON public.escalations;
CREATE POLICY "Allow select escalations to authenticated" ON public.escalations FOR SELECT TO authenticated USING (true);

-- Manager full access policies
DROP POLICY IF EXISTS "Allow manager full access to working hours" ON public.pdr_working_hours;
CREATE POLICY "Allow manager full access to working hours" ON public.pdr_working_hours FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'okul_yoneticisi');

DROP POLICY IF EXISTS "Allow manager full access to roster" ON public.on_call_roster;
CREATE POLICY "Allow manager full access to roster" ON public.on_call_roster FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'okul_yoneticisi');

DROP POLICY IF EXISTS "Allow manager full access to escalations" ON public.escalations;
CREATE POLICY "Allow manager full access to escalations" ON public.escalations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'okul_yoneticisi');
