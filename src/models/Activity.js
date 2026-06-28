// ─── ACTIVITY REFERENCE MODEL ────────────────────────────────────
// Rule 2: Activity is a reference, not a module.
// APCP does not manage activities — Primavera/P6 does.
// These fields are used wherever a record needs to reference an activity.
// Future-compatible with Primavera/P6/MS Project import.

export const ACTIVITY_FIELDS = {
  activity_id:   null,   // e.g. A1010 — the P6 activity ID
  activity_name: null,   // e.g. Basement Foundation Pour
  wbs_code:      null,   // e.g. 1.1.2
  location:      null,   // e.g. Block A
  zone:          null,   // e.g. Basement / Level 3
  discipline:    null,   // e.g. Civil / Structural
}

// Columns to include when a table needs activity reference
// Use this as documentation for schema design
export const ACTIVITY_COLUMNS = `
  activity_id    text,
  activity_name  text,
  wbs_code       text,
  location       text,
  zone           text,
  discipline     text,
`

// Future: when P6 import is ready, these map to P6 fields
export const P6_FIELD_MAP = {
  activity_id:   'task_id',
  activity_name: 'task_name',
  wbs_code:      'wbs_id',
  location:      null,   // custom field in P6
  zone:          null,   // custom field in P6
  discipline:    null,   // custom field in P6
}
