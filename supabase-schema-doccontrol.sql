-- ═══════════════════════════════════════════════════════════════
-- APCP v3 — Document Control Schema (run AFTER main schema)
-- SQL Editor → New Query → paste → Run
-- ═══════════════════════════════════════════════════════════════

-- ─── DRAWINGS ───────────────────────────────────────────────────
create table if not exists public.drawings (
  id bigserial primary key,
  drw_number text unique not null,
  project_code text not null,
  title text,
  discipline text,
  revision text,
  date date,
  prepared_by text,
  activity_id text,
  activity_name text,
  remarks text,
  drive_link text,
  created_at timestamptz default now()
);

alter table public.drawings enable row level security;
create policy "Auth users view drawings" on public.drawings for select using (auth.role() = 'authenticated');
create policy "Auth users insert drawings" on public.drawings for insert with check (auth.role() = 'authenticated');
create policy "Auth users update drawings" on public.drawings for update using (auth.role() = 'authenticated');
create policy "Admin delete drawings" on public.drawings for delete using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));
create index if not exists drawings_project_code_idx on public.drawings(project_code);

-- ─── DOCUMENTS ──────────────────────────────────────────────────
create table if not exists public.documents (
  id bigserial primary key,
  doc_number text unique not null,
  project_code text not null,
  title text,
  category text,
  discipline text,
  date date,
  prepared_by text,
  activity_id text,
  activity_name text,
  mrf_number text,
  status text default 'Draft',
  remarks text,
  drive_link text,
  created_at timestamptz default now()
);

alter table public.documents enable row level security;
create policy "Auth users view documents" on public.documents for select using (auth.role() = 'authenticated');
create policy "Auth users insert documents" on public.documents for insert with check (auth.role() = 'authenticated');
create policy "Auth users update documents" on public.documents for update using (auth.role() = 'authenticated');
create policy "Admin delete documents" on public.documents for delete using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));
create index if not exists documents_project_code_idx on public.documents(project_code);

-- ─── IF04 SHOP DRAWING SUBMITTALS ───────────────────────────────
create table if not exists public.if04 (
  id bigserial primary key,
  if04_number text unique not null,
  project_code text not null,
  date date,
  activity_id text,
  activity_name text,
  wbs_code text,
  mrf_number text,
  discipline text,
  drawing_number text,
  drawing_title text,
  revision text,
  ifc_drawing text,
  consultant text,
  client text,
  submitted_date date,
  response_date date,
  response_code text,
  status text default 'Draft',
  prepared_by text,
  copies integer default 1,
  remarks text,
  consultant_remarks text,
  drive_link text,
  created_at timestamptz default now()
);

alter table public.if04 enable row level security;
create policy "Auth users view if04" on public.if04 for select using (auth.role() = 'authenticated');
create policy "Auth users insert if04" on public.if04 for insert with check (auth.role() = 'authenticated');
create policy "Auth users update if04" on public.if04 for update using (auth.role() = 'authenticated');
create index if not exists if04_project_code_idx on public.if04(project_code);

-- ─── IF08 RFI ───────────────────────────────────────────────────
create table if not exists public.if08 (
  id bigserial primary key,
  rfi_number text unique not null,
  project_code text not null,
  date date,
  subject text,
  description text,
  priority text default 'Medium',
  activity_id text,
  activity_name text,
  wbs_code text,
  mrf_number text,
  drawing_ref text,
  spec_ref text,
  requested_by text,
  addressed_to text,
  required_response_date date,
  response_date date,
  response text,
  impact text default 'TBD',
  impact_description text,
  status text default 'Draft',
  drive_link text,
  remarks text,
  created_at timestamptz default now()
);

alter table public.if08 enable row level security;
create policy "Auth users view if08" on public.if08 for select using (auth.role() = 'authenticated');
create policy "Auth users insert if08" on public.if08 for insert with check (auth.role() = 'authenticated');
create policy "Auth users update if08" on public.if08 for update using (auth.role() = 'authenticated');
create index if not exists if08_project_code_idx on public.if08(project_code);
