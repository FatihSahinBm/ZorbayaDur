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

drop policy if exists "Allow anonymous inserts to reports" on public.reports;
drop policy if exists "Allow authenticated users to read reports" on public.reports;
drop policy if exists "Allow authenticated users to update reports" on public.reports;
drop policy if exists "Allow authenticated users to read logs" on public.audit_logs;

create policy "Allow public inserts to reports" on public.reports for insert to public with check (true);
create policy "Allow public read reports" on public.reports for select to public using (true);
create policy "Allow public update reports" on public.reports for update to public using (true);
create policy "Allow public delete reports" on public.reports for delete to public using (true);

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

create trigger on_report_status_change
    after update of status on public.reports
    for each row
    execute function public.log_report_change();
