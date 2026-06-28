-- ═══════════════════════════════════════════════════════════════
-- APCP v3 — Architecture Refactor Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ─── SUPPLIERS TABLE ────────────────────────────────────────────
create table if not exists public.suppliers (
  id bigserial primary key,
  supplier_code text unique not null,
  supplier_name text not null,
  contact_person text,
  phone text,
  email text,
  category text default 'General',
  address text,
  status text default 'Active',
  remarks text,
  created_at timestamptz default now()
);

alter table public.suppliers enable row level security;

create policy "Auth view suppliers"
  on public.suppliers for select
  using (auth.role() = 'authenticated');

create policy "Procurement insert suppliers"
  on public.suppliers for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('Admin', 'PM', 'Procurement')
    )
  );

create policy "Procurement update suppliers"
  on public.suppliers for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('Admin', 'PM', 'Procurement')
    )
  );

create index if not exists suppliers_name_idx on public.suppliers(supplier_name);
create index if not exists suppliers_category_idx on public.suppliers(category);

-- ─── ADD SUPPLIER FIELDS TO MRFS ────────────────────────────────
-- supplier_id: new reference to suppliers table
-- supplier_name_legacy: preserves old free-text supplier name
-- "Supplier to be confirmed" is handled by null supplier_id

alter table public.mrfs
  add column if not exists supplier_id bigint references public.suppliers(id),
  add column if not exists supplier_name_legacy text;

-- Migrate existing supplier names to legacy field
update public.mrfs
set supplier_name_legacy = supplier
where supplier is not null and supplier_name_legacy is null;

create index if not exists mrfs_supplier_id_idx on public.mrfs(supplier_id);
