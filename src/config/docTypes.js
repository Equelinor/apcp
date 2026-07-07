// ─── DOCUMENT TYPE CONFIG ────────────────────────────────────────
// Change prefixes here — nowhere else needs to change
// Format: TYPE-PROJCODE-YEAR-SEQUENCE

export const DOC_TYPE_CONFIG = {
  DRW:  { prefix: 'DRW',  label: 'Drawing',                  color: '#1E40AF' },
  DOC:  { prefix: 'DOC',  label: 'Document',                 color: '#5B21B6' },
  IF04: { prefix: 'IF04', label: 'Shop Drawing Submittal',   color: '#065F46' },
  IF05: { prefix: 'IF05', label: 'Material Approval (MAC)',  color: '#92400E' },
  IF06: { prefix: 'IF06', label: 'Mock-up Inspection',       color: '#1558A0' },
  IF07: { prefix: 'IF07', label: 'Document Submittal',       color: '#5B21B6' },
  IF08: { prefix: 'IF08', label: 'RFI',                      color: '#B91C1C' },
  IF09: { prefix: 'IF09', label: 'Activity Inspection',      color: '#065F46' },
  IF12: { prefix: 'IF12', label: 'Sub-contractor Approval',  color: '#92400E' },
}

// ─── DEFAULT DISCIPLINES ─────────────────────────────────────────
// Stored in localStorage per project — Admin can edit
export const DEFAULT_DISCIPLINES = [
  'Civil / Structural',
  'Architectural',
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Finishing',
  'Geotechnical',
  'Infrastructure',
]

export function getDisciplines(projectCode) {
  const key = `apcp_disciplines_${projectCode}`
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : DEFAULT_DISCIPLINES
}

export function saveDisciplines(projectCode, disciplines) {
  localStorage.setItem(`apcp_disciplines_${projectCode}`, JSON.stringify(disciplines))
}

// ─── DOCUMENT STATUS OPTIONS ──────────────────────────────────────
export const SUBMITTAL_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Approved with Comments',
  'Rejected',
  'Resubmitted',
  'Superseded',
]

export const DRAWING_REVISIONS = ['Rev 00', 'Rev 01', 'Rev 02', 'Rev 03', 'Rev 04', 'Rev 05', 'IFC', 'As Built']

// ─── RESPONSE CODES (consultant) ─────────────────────────────────
export const RESPONSE_CODES = [
  'A — Approved',
  'B — Approved with Comments',
  'C — Revise and Resubmit',
  'D — Rejected',
]

// ─── GENERATE DOC NUMBER ─────────────────────────────────────────
export function genDocNumber(typeKey, projectCode, sequence) {
  const config = DOC_TYPE_CONFIG[typeKey]
  const prefix = config?.prefix || typeKey
  const year = new Date().getFullYear()
  const seq = String(sequence).padStart(5, '0')
  return `${prefix}-${projectCode}-${year}-${seq}`
}

// ─── MAC (IF05) NUMBER — deliberate exception, not the TYPE-PROJCODE-YEAR-SEQ
// format above. Format: AI-<project number>-MAC-XXX — "AI" is a fixed company
// code (Axion Imagineering), <project number> is the trailing segment of the
// project's own project_number (e.g. "AX-2026-0632" → "0632"), and there's no
// year. Sequence is still counted per-project, so the same AI-0632-MAC-001
// can't repeat within SCB but a different project's own number segment keeps
// its MACs visually distinct (2026-07-07, MAC-only — other doc types are
// unaffected and still use genDocNumber above; superseded the earlier
// MAC-AI-XXX format from the same day).
export function genMacNumber(projectNumber, sequence) {
  const parts = String(projectNumber || '').split('-')
  const projNum = parts[parts.length - 1] || ''
  return `AI-${projNum}-MAC-${String(sequence).padStart(3, '0')}`
}
