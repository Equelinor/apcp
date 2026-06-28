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

-- ─── IF05 MAC ───────────────────────────────────────────────────
create table if not exists public.if05 (
  id bigserial primary key,
  if05_number text unique not null,
  project_code text not null,
  date date,
  activity_id text, activity_name text, wbs_code text,
  mrf_number text, material_desc text, mat_spec text,
  brand text, grade text, code_ref text, sample_ref text,
  origin text, color text,
  prepared_by text, addressed_to text,
  submitted_date date, response_date date, response_code text,
  status text default 'Draft',
  remarks text, consultant_remarks text, drive_link text,
  created_at timestamptz default now()
);
alter table public.if05 enable row level security;
create policy "Auth view if05" on public.if05 for select using (auth.role() = 'authenticated');
create policy "Auth insert if05" on public.if05 for insert with check (auth.role() = 'authenticated');
create policy "Auth update if05" on public.if05 for update using (auth.role() = 'authenticated');
create index if not exists if05_project_code_idx on public.if05(project_code);

-- ─── IF06 MOCK-UP ───────────────────────────────────────────────
create table if not exists public.if06 (
  id bigserial primary key,
  if06_number text unique not null,
  project_code text not null,
  date date,
  activity_id text, activity_name text, wbs_code text,
  mrf_number text, discipline text, location text, zone text,
  mockup_desc text, mockup_ref text, ifc_drawing text,
  prepared_by text, addressed_to text,
  inspection_date date, inspector text,
  submitted_date date, response_date date, response_code text,
  status text default 'Draft',
  remarks text, inspector_remarks text, drive_link text,
  created_at timestamptz default now()
);
alter table public.if06 enable row level security;
create policy "Auth view if06" on public.if06 for select using (auth.role() = 'authenticated');
create policy "Auth insert if06" on public.if06 for insert with check (auth.role() = 'authenticated');
create policy "Auth update if06" on public.if06 for update using (auth.role() = 'authenticated');
create index if not exists if06_project_code_idx on public.if06(project_code);

-- ─── IF07 DOC SUBMITTAL ─────────────────────────────────────────
create table if not exists public.if07 (
  id bigserial primary key,
  if07_number text unique not null,
  project_code text not null,
  date date, doc_type text, title text,
  ref_number text, revision text,
  activity_id text, activity_name text, wbs_code text,
  mrf_number text, prepared_by text, addressed_to text,
  submitted_date date, response_date date, response_code text,
  status text default 'Draft', copies integer default 1,
  remarks text, consultant_remarks text, drive_link text,
  created_at timestamptz default now()
);
alter table public.if07 enable row level security;
create policy "Auth view if07" on public.if07 for select using (auth.role() = 'authenticated');
create policy "Auth insert if07" on public.if07 for insert with check (auth.role() = 'authenticated');
create policy "Auth update if07" on public.if07 for update using (auth.role() = 'authenticated');
create index if not exists if07_project_code_idx on public.if07(project_code);

-- ─── IF09 ACTIVITY INSPECTION REQUEST ───────────────────────────
create table if not exists public.if09 (
  id bigserial primary key,
  if09_number text unique not null,
  project_code text not null,
  date date, inspection_type text,
  activity_id text, activity_name text, wbs_code text,
  mrf_number text, discipline text, location text, zone text,
  description text, ifc_drawing text, shop_drawing text,
  prepared_by text, addressed_to text,
  requested_inspection_date date, inspection_date date, inspector text,
  result text, result_remarks text,
  status text default 'Draft',
  remarks text, drive_link text,
  created_at timestamptz default now()
);
alter table public.if09 enable row level security;
create policy "Auth view if09" on public.if09 for select using (auth.role() = 'authenticated');
create policy "Auth insert if09" on public.if09 for insert with check (auth.role() = 'authenticated');
create policy "Auth update if09" on public.if09 for update using (auth.role() = 'authenticated');
create index if not exists if09_project_code_idx on public.if09(project_code);

-- ─── IF12 SUB-CONTRACTOR APPROVAL ───────────────────────────────
create table if not exists public.if12 (
  id bigserial primary key,
  if12_number text unique not null,
  project_code text not null,
  date date,
  activity_id text, activity_name text, wbs_code text,
  subcontractor_name text, trade text, work_scope text,
  discipline text, location text, zone text,
  cr_number text, vat_number text,
  contact_person text, contact_phone text,
  prepared_by text, addressed_to text,
  submitted_date date, response_date date, response_code text,
  status text default 'Draft',
  remarks text, consultant_remarks text, drive_link text,
  created_at timestamptz default now()
);
alter table public.if12 enable row level security;
create policy "Auth view if12" on public.if12 for select using (auth.role() = 'authenticated');
create policy "Auth insert if12" on public.if12 for insert with check (auth.role() = 'authenticated');
create policy "Auth update if12" on public.if12 for update using (auth.role() = 'authenticated');
create index if not exists if12_project_code_idx on public.if12(project_code);
