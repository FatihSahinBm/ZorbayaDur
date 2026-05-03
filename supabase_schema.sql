-- Zorbaya Dur - Supabase Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Reports Table
create table public.reports (
    id uuid default uuid_generate_v4() primary key,
    tracking_code varchar(20) not null unique,
    category varchar(50) not null,
    content text not null,
    risk_level varchar(20) not null default 'Bilinmiyor',
    status varchar(20) not null default 'Yeni',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Audit Logs Table (MEB Panel)
create table public.audit_logs (
    id uuid default uuid_generate_v4() primary key,
    log_id varchar(20) not null unique,
    action varchar(255) not null,
    actor varchar(100) not null,
    status varchar(20) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Row Level Security (RLS) Policies
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- Allow public access for demo purposes (Since we simulate auth)
create policy "Allow public inserts to reports" on public.reports for insert to public with check (true);
create policy "Allow public read reports" on public.reports for select to public using (true);
create policy "Allow public update reports" on public.reports for update to public using (true);
create policy "Allow public delete reports" on public.reports for delete to public using (true);

create policy "Allow public inserts to logs" on public.audit_logs for insert to public with check (true);
create policy "Allow public read logs" on public.audit_logs for select to public using (true);

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
