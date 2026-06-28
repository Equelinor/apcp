-- ═══════════════════════════════════════════════════════════════
-- APCP v3 — Rule 7 + Projects Table Migration
-- SQL Editor → New Query → paste → Run
-- ═══════════════════════════════════════════════════════════════

-- ─── PROJECTS TABLE ─────────────────────────────────────────────
create table if not exists public.projects (
  id bigserial primary key,
  project_code text unique not null,
  project_name text not null,
  project_number text,
  client text,
  consultant text,
  contractor text,
  location text,
  status text default 'Active Project',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Auth view projects"
  on public.projects for select
  using (auth.role() = 'authenticated');

create policy "Admin manage projects"
  on public.projects for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Admin'
    )
  );

-- Seed the two existing projects
insert into public.projects (project_code, project_name, project_number, contractor, status)
values
  ('ANT', 'Al Noor Tower',      'AX-2025-001', 'Axion Imagineering Construction Co. W.L.L', 'Active Project'),
  ('MRS', 'Marina Residences',  'AX-2025-002', 'Axion Imagineering Construction Co. W.L.L', 'Active Project')
on conflict (project_code) do nothing;

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- ─── RULE 7: ADD REFERENCE FIELDS TO MRFS ───────────────────────
-- material_id: future Material Register reference (nullable)
-- material_name_snapshot: free text snapshot at time of creation
-- material_description_snapshot: full description snapshot

alter table public.mrfs
  add column if not exists material_id bigint,
  add column if not exists material_name_snapshot text,
  add column if not exists material_description_snapshot text;

-- Populate snapshots from existing data
update public.mrfs
set material_description_snapshot = material_desc
where material_desc is not null and material_description_snapshot is null;
