-- ═══════════════════════════════════════════════════════════════
-- APCP v3 — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Project: fwfwmdquqewndzlkfjpr (Singapore)
-- ═══════════════════════════════════════════════════════════════

-- ─── PROFILES ───────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null default 'Viewer',
  project_code text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'Viewer');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── MRFS ───────────────────────────────────────────────────────
create table if not exists public.mrfs (
  id bigserial primary key,
  mrf_number text unique not null,
  project_code text not null,
  date date,
  location text,
  zone text,
  requested_by text,
  priority text default 'Medium',
  material_desc text,
  qty numeric,
  unit text,
  required_on_site date,
  lead_time_days integer,
  latest_raise_date date,
  related_activity text,
  remarks text,

  -- Material spec
  mat_spec text,
  brand text,
  grade text,
  code_ref text,
  sample_ref text,
  subm_ref text,
  subm_status text default 'Pending',
  consult_approval_date date,

  -- Drawings
  ifc_drawing text,
  shop_drawing text,
  drawing_rev text,

  -- Programme
  wbs_code text,
  activity_id text,
  activity_name text,
  programme_ref text,
  planned_start date,
  planned_finish date,

  -- Approval
  approval_status text default 'Draft',
  approval_remarks text,
  approval_date date,
  approval_by text,

  -- Procurement
  supplier text,
  quotation_ref text,
  po_number text,
  po_date date,
  po_amount numeric,
  expected_delivery date,

  -- Delivery
  delivered_qty numeric default 0,
  dn_number text,
  delivery_date date,
  store_received boolean default false,
  store_received_date date,
  site_received boolean default false,

  -- MIR / Inspection
  mir_number text,
  mir_raised_date date,
  mir_submitted_date date,
  mir_approved_date date,
  mir_rejected_date date,
  mir_resub_count integer default 0,
  mir_result text,
  mir_remarks text,
  site_release_date date,

  -- Site
  site_status text default 'Not Ordered',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.mrfs enable row level security;

-- All authenticated users can view MRFs
create policy "Authenticated users can view mrfs"
  on public.mrfs for select
  using (auth.role() = 'authenticated');

-- Permitted roles can insert
create policy "Permitted roles can insert mrfs"
  on public.mrfs for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('Admin', 'PM', 'Procurement', 'Site Engineer')
    )
  );

-- Permitted roles can update
create policy "Permitted roles can update mrfs"
  on public.mrfs for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('Admin', 'PM', 'Procurement', 'Planning', 'Site Engineer')
    )
  );

-- Only admin can delete
create policy "Admin can delete mrfs"
  on public.mrfs for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Admin'
    )
  );

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger mrfs_updated_at
  before update on public.mrfs
  for each row execute procedure public.set_updated_at();

-- Indexes
create index if not exists mrfs_project_code_idx on public.mrfs(project_code);
create index if not exists mrfs_approval_status_idx on public.mrfs(approval_status);
create index if not exists mrfs_activity_id_idx on public.mrfs(activity_id);
create index if not exists mrfs_site_status_idx on public.mrfs(site_status);


-- ═══════════════════════════════════════════════════════════════
-- FIRST USER SETUP (run after creating first user in Supabase Auth)
-- Replace the email and values below with real data.
-- ═══════════════════════════════════════════════════════════════

-- After creating the user in Auth → Users, run:
-- update public.profiles
-- set name = 'Your Name', role = 'Admin'
-- where id = (select id from auth.users where email = 'you@axion.com');
