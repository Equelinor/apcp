-- ════════════════════════════════════════════════════════════
-- APCP v3 — BOQ Schema
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- BOQ Sections (trade groupings)
CREATE TABLE IF NOT EXISTS boq_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code    TEXT NOT NULL,
  section_code    TEXT NOT NULL,
  section_name    TEXT NOT NULL,
  trade           TEXT,
  sort_order      INTEGER DEFAULT 0,
  total_amount    NUMERIC(18,3) DEFAULT 0,
  completed_value NUMERIC(18,3) DEFAULT 0,
  progress_pct    NUMERIC(5,2)  DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_code, section_code)
);

-- BOQ Items
CREATE TABLE IF NOT EXISTS boq_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code     TEXT NOT NULL,
  section_id       UUID REFERENCES boq_sections(id) ON DELETE CASCADE,
  section_code     TEXT NOT NULL,
  item_no          TEXT NOT NULL,
  description      TEXT NOT NULL,
  unit             TEXT,
  quantity         NUMERIC(14,3) DEFAULT 0,
  rate             NUMERIC(14,3) DEFAULT 0,
  amount           NUMERIC(18,3) DEFAULT 0,
  trade            TEXT,
  remarks          TEXT,
  -- Progress fields
  completed_qty    NUMERIC(14,3) DEFAULT 0,
  progress_pct     NUMERIC(5,2)  DEFAULT 0,
  completed_value  NUMERIC(18,3) DEFAULT 0,
  balance_value    NUMERIC(18,3) DEFAULT 0,
  status           TEXT DEFAULT 'Not Started',
  -- Optional links
  linked_activity  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_code, item_no)
);

-- BOQ Progress Updates (audit trail)
CREATE TABLE IF NOT EXISTS boq_progress_updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_item_id   UUID REFERENCES boq_items(id) ON DELETE CASCADE,
  project_code  TEXT NOT NULL,
  updated_by    TEXT,
  prev_pct      NUMERIC(5,2) DEFAULT 0,
  new_pct       NUMERIC(5,2) DEFAULT 0,
  prev_qty      NUMERIC(14,3) DEFAULT 0,
  new_qty       NUMERIC(14,3) DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boq_items_project    ON boq_items(project_code);
CREATE INDEX IF NOT EXISTS idx_boq_items_section    ON boq_items(section_id);
CREATE INDEX IF NOT EXISTS idx_boq_sections_project ON boq_sections(project_code);
