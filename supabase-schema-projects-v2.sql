-- ════════════════════════════════════════════════════════════
-- APCP v3 — Projects table v2
-- Adds all new fields to existing projects table
-- Run in Supabase SQL Editor (new tab)
-- ════════════════════════════════════════════════════════════

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS contract_number     TEXT,
  ADD COLUMN IF NOT EXISTS contract_type       TEXT DEFAULT 'Lump Sum',
  ADD COLUMN IF NOT EXISTS contract_value      NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS currency            TEXT DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS start_date          DATE,
  ADD COLUMN IF NOT EXISTS end_date            DATE,
  ADD COLUMN IF NOT EXISTS original_duration   INTEGER,

  -- Key people
  ADD COLUMN IF NOT EXISTS project_manager     TEXT,
  ADD COLUMN IF NOT EXISTS site_engineer       TEXT,
  ADD COLUMN IF NOT EXISTS qaqc_engineer       TEXT,
  ADD COLUMN IF NOT EXISTS planning_engineer   TEXT,

  -- Contacts (feed into IF form headers)
  ADD COLUMN IF NOT EXISTS client_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS client_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS client_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS consultant_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS consultant_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS consultant_contact_phone TEXT,

  -- Logos (base64 data URLs — feed into print engine)
  ADD COLUMN IF NOT EXISTS client_logo         TEXT,
  ADD COLUMN IF NOT EXISTS consultant_logo     TEXT,

  -- Subcontractors (JSONB array)
  -- Each item: { name, scope, cr_number, contact }
  ADD COLUMN IF NOT EXISTS subcontractors      JSONB DEFAULT '[]'::jsonb,

  -- Third parties (JSONB array)
  -- Each item: { name, role, contact }
  ADD COLUMN IF NOT EXISTS third_parties       JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  ADD COLUMN IF NOT EXISTS notes               TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
