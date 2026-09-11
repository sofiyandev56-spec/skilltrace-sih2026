-- SkillTrace Supabase Schema Setup
-- Paste this in: https://supabase.com/dashboard/project/sykivvztgbwltzkifhqt/sql/new

-- Admin users / roster (master user source of truth)
create table if not exists admin_users (
  id text primary key,
  name text,
  email text unique,
  role text default 'client',
  verified boolean default false,
  is_master boolean default false,
  company_name text,
  designation text,
  last_login text,
  created_at timestamptz default now()
);

-- WhatsApp OTP + survey sessions
create table if not exists whatsapp_sessions (
  phone text primary key,
  session_data jsonb,
  updated_at timestamptz default now()
);

-- Web/WhatsApp check-ins
create table if not exists checkins (
  id text primary key default gen_random_uuid()::text,
  trainee_id text,
  date text,
  source text,
  payload jsonb,
  created_at timestamptz default now()
);

-- DPDPA consents
create table if not exists consents (
  id text primary key default gen_random_uuid()::text,
  trainee_id text,
  purpose text,
  granted boolean default true,
  date text,
  created_at timestamptz default now()
);

-- Trainees (cloud mirror)
create table if not exists trainees (
  id text primary key,
  name text,
  course text,
  district text,
  gender text,
  age_group text,
  category text,
  phone text,
  cohort text,
  provider_id text,
  employer text,
  salary integer,
  outcome text default 'awaiting_confirmation',
  trust_level text default 'low',
  certification_date text,
  placement_date text,
  created_at timestamptz default now()
);

-- Skill/job events per trainee
create table if not exists events (
  id text primary key,
  trainee_id text,
  date text,
  what_happened text,
  job_role text,
  employer text,
  salary integer,
  source text,
  trust_level text,
  created_at timestamptz default now()
);

-- Dispute records
create table if not exists disputes (
  id text primary key,
  trainee_id text,
  employer_claim text,
  trainee_claim text,
  date text,
  status text default 'open',
  assigned_officer text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table admin_users enable row level security;
alter table whatsapp_sessions enable row level security;
alter table checkins enable row level security;
alter table consents enable row level security;
alter table trainees enable row level security;
alter table events enable row level security;
alter table disputes enable row level security;

-- Drop old policies if they exist (safe re-run)
do $$ begin
  drop policy if exists "pub_all_admin_users" on admin_users;
  drop policy if exists "pub_all_whatsapp_sessions" on whatsapp_sessions;
  drop policy if exists "pub_all_checkins" on checkins;
  drop policy if exists "pub_all_consents" on consents;
  drop policy if exists "pub_write_trainees" on trainees;
  drop policy if exists "pub_write_events" on events;
  drop policy if exists "pub_all_disputes" on disputes;
exception when others then null;
end $$;

-- Open policies (service key used for writes; anon key for reads)
create policy "pub_all_admin_users" on admin_users for all using (true) with check (true);
create policy "pub_all_whatsapp_sessions" on whatsapp_sessions for all using (true) with check (true);
create policy "pub_all_checkins" on checkins for all using (true) with check (true);
create policy "pub_all_consents" on consents for all using (true) with check (true);
create policy "pub_write_trainees" on trainees for all using (true) with check (true);
create policy "pub_write_events" on events for all using (true) with check (true);
create policy "pub_all_disputes" on disputes for all using (true) with check (true);

-- Seed master admin (safe: does nothing if already exists)
insert into admin_users (id, name, email, role, verified, is_master, designation, last_login)
values (
  'MSDE-MASTER-01',
  'Shlok Borad',
  'shlok.borad11@gmail.com',
  'government',
  true,
  true,
  'Master Government Officer & Sovereign Administrator',
  'Active Master Authority'
) on conflict (id) do nothing;

-- Done!
select 'SkillTrace schema ready' as status, count(*) as admin_user_count from admin_users;
