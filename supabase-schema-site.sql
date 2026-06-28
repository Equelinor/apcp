-- ═══════════════════════════════════════════════════════════════
-- APCP v3 — Site Phase: DAR Table
-- SQL Editor → New Query → paste → Run
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.dars (
  id bigserial primary key,
  dar_number text unique not null,
  project_code text not null,
  date date not null,
  shift text default 'Day Shift',
  weather text,
  temperature text,
  prepared_by text,
  reviewed_by text,
  status text default 'Draft',
  general_remarks text,

  -- JSONB arrays — activities, labour, equipment, visitors, issues
  activities  jsonb default '[]',
  labour      jsonb default '[]',
  equipment   jsonb default '[]',
  visitors    jsonb default '[]',
  issues      jsonb default '[]',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.dars enable row level security;

create policy "Auth view dars"
  on public.dars for select
  using (auth.role() = 'authenticated');

create policy "Auth insert dars"
  on public.dars for insert
  with check (auth.role() = 'authenticated');

create policy "Auth update dars"
  on public.dars for update
  using (auth.role() = 'authenticated');

create index if not exists dars_project_code_idx on public.dars(project_code);
create index if not exists dars_date_idx on public.dars(date);

create trigger dars_updated_at
  before update on public.dars
  for each row execute procedure public.set_updated_at();
