-- Zorbaya Dur - Supabase Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Reports Table (Öğrenci İhbarları)
create table if not exists public.reports (
    id uuid default uuid_generate_v4() primary key,
    tracking_code varchar(20) not null unique,
    student_id varchar(100), -- Öğrencinin paneli için gerekli, PDR'dan gizlenecek
    category varchar(100) not null,
    content text not null,
    risk_level varchar(20) not null default 'Bilinmiyor',
    status varchar(20) not null default 'Yeni',
    assigned_role varchar(20) not null default 'pdr',
    evidence_url text,
    deadline_at timestamp with time zone,
    identity_level int default 1, -- 1: PDR'ye gizli, 2: açık
    encrypted_identity text, -- AES-256 ile şifrelenmiş isim/sınıf bilgisi
    identity_updated_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Audit Logs Table (MEB Panel)
create table if not exists public.audit_logs (
    id uuid default uuid_generate_v4() primary key,
    log_id varchar(20) not null unique,
    action varchar(255) not null,
    actor varchar(100) not null,
    status varchar(20) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Messages Table (PDR - Öğrenci Anonim Mesajlaşma)
create table if not exists public.messages (
    id uuid default uuid_generate_v4() primary key,
    report_id uuid references public.reports(id) on delete cascade,
    sender_role varchar(20) not null, -- 'student' veya 'pdr'
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Row Level Security (RLS) Policies (DEMO İÇİN HERKESE AÇIK)
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Allow public inserts to reports" on public.reports;
drop policy if exists "Allow public read reports" on public.reports;
drop policy if exists "Allow public update reports" on public.reports;
drop policy if exists "Allow public delete reports" on public.reports;
drop policy if exists "Allow public inserts to logs" on public.audit_logs;
drop policy if exists "Allow public read logs" on public.audit_logs;
drop policy if exists "Allow public inserts to messages" on public.messages;
drop policy if exists "Allow public read messages" on public.messages;

create policy "Allow public inserts to reports" on public.reports for insert to public with check (true);
create policy "Allow public read reports" on public.reports for select to public using (true);
create policy "Allow public update reports" on public.reports for update to public using (true);
create policy "Allow public delete reports" on public.reports for delete to public using (true);

-- Kademeli Kimlik Sistemi RLS Politikaları (Üretim ortamında Rol Tabanlı Auth entegrasyonu ile aktif edilir):
-- Seviye 1 (PDR'ye Gizli - identity_level = 2): Sadece pdr_role veya JWT claim'i pdr olan görebilir
-- CREATE POLICY "Allow read identity level 2 to PDR" ON public.reports FOR SELECT TO authenticated
-- USING (identity_level = 1 OR (identity_level = 2 AND auth.jwt() ->> 'role' = 'pdr'));

-- Seviye 2 (Açık Bildirim - identity_level = 3): pdr_role + admin_role görebilir
-- CREATE POLICY "Allow read identity level 3 to PDR and Admin" ON public.reports FOR SELECT TO authenticated
-- USING (identity_level = 1 OR identity_level = 2 OR (identity_level = 3 AND auth.jwt() ->> 'role' IN ('pdr', 'admin')));

create policy "Allow public inserts to logs" on public.audit_logs for insert to public with check (true);
create policy "Allow public read logs" on public.audit_logs for select to public using (true);

create policy "Allow public inserts to messages" on public.messages for insert to public with check (true);
create policy "Allow public read messages" on public.messages for select to public using (true);

-- Create a function to automatically log report status changes
create or replace function public.log_report_change()
returns trigger as $$
begin
    insert into public.audit_logs (log_id, action, actor, status)
    values (
        'LOG-' || floor(random() * 9000 + 1000)::text,
        'İhbar Durumu Güncellendi: ' || NEW.tracking_code,
        'PDR_USER',
        'Başarılı'
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_report_status_change on public.reports;
create trigger on_report_status_change
    after update of status on public.reports
    for each row
    execute function public.log_report_change();

-- 5. Emergency Break-Glass Bypass Mechanism (Acil Durum Camı Kırma)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

create table if not exists public.emergency_bypasses (
    id uuid default uuid_generate_v4() primary key,
    report_id uuid not null references public.reports(id) on delete cascade,
    actor_id uuid references auth.users(id) on delete set null,
    justification text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.emergency_bypasses enable row level security;

drop policy if exists "Allow select to authorized roles" on public.emergency_bypasses;
drop policy if exists "Allow insert to authenticated roles" on public.emergency_bypasses;

create policy "Allow select to authorized roles" on public.emergency_bypasses
    for select to authenticated
    using (auth.jwt() ->> 'role' in ('pdr', 'okul_yoneticisi', 'admin'));

create policy "Allow insert to authenticated roles" on public.emergency_bypasses
    for insert to authenticated
    with check (auth.jwt() ->> 'role' in ('okul_yoneticisi', 'admin'));

create or replace function public.decrypt_identity_emergency(target_report_id uuid, justification text)
returns text as $$
declare
    current_actor_id uuid;
    actor_name text;
    encrypted_id_b64 text;
    combined bytea;
    iv bytea;
    ciphertext bytea;
    decrypted_bytes bytea;
    decrypted_text text;
    key_bytes bytea;
    log_id_val varchar(20);
    user_role text;
begin
    -- Verify user role from JWT
    user_role := auth.jwt() ->> 'role';
    if user_role not in ('okul_yoneticisi', 'admin') then
        raise exception 'Yetkisiz işlem: Sadece okul yöneticileri acil durum yetkisini kullanabilir.';
    end if;

    -- Verify justification is not empty
    if justification is null or trim(justification) = '' then
        raise exception 'Zorunlu yasal gerekçe boş bırakılamaz.';
    end if;

    -- Verify current user is authenticated
    current_actor_id := auth.uid();
    if current_actor_id is null then
        raise exception 'Bu işlem için giriş yapılması gereklidir.';
    end if;

    -- Resolve actor name for audit logging
    select coalesce(
        (raw_user_meta_data->>'name') || ' (' || coalesce(raw_user_meta_data->>'role', 'Kullanıcı') || ')',
        email,
        'Kullanıcı (' || current_actor_id::text || ')'
    ) into actor_name
    from auth.users
    where id = current_actor_id;

    -- Get the encrypted identity for the report
    select encrypted_identity into encrypted_id_b64
    from public.reports
    where id = target_report_id;

    if encrypted_id_b64 is null then
        raise exception 'Bu ihbara ait şifreli kimlik bulunamadı.';
    end if;

    -- Insert emergency bypass log
    insert into public.emergency_bypasses (report_id, actor_id, justification)
    values (target_report_id, current_actor_id, justification);

    -- Insert audit log with CRITICAL_EMERGENCY_BYPASS action type
    log_id_val := 'LOG-' || floor(random() * 9000 + 1000)::text;
    insert into public.audit_logs (log_id, action, actor_id, actor, status)
    values (
        log_id_val,
        'CRITICAL_EMERGENCY_BYPASS: ' || target_report_id::text,
        current_actor_id,
        actor_name,
        'Başarılı'
    );

    -- Decrypt the identity
    begin
        key_bytes := 'zorbaya-dur-secret-key-12345678'::bytea;
        
        combined := decode(encrypted_id_b64, 'base64');
        iv := substring(combined from 1 for 16);
        ciphertext := substring(combined from 17);
        
        decrypted_bytes := decrypt_iv(ciphertext, key_bytes, iv, 'aes-cbc/pad:pkcs');
        decrypted_text := convert_from(decrypted_bytes, 'utf-8');
        
        return decrypted_text;
    exception when others then
        raise exception 'Kimlik çözme hatası: Anahtar uyumsuz veya şifreli veri bozuk.';
    end;
end;
$$ language plpgsql security definer;

