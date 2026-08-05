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

// ─── MRF (Material Request) NUMBER — deliberate exception, matching the
// paper "Resource Requisition" reference: AICC/MRF/<project number>-<year>-<seq>
// (e.g. AICC/MRF/494-2026-47). "AICC" is a fixed company code, <project number>
// is the trailing segment of the project's own project_number (same convention
// as genMacNumber), no zero-padding on the sequence (reference shows plain
// "47", not "047"). MRF-only, added 2026-07-19 — other doc types are
// unaffected and still use genDocNumber above.
export function genMrfNumber(projectNumber, sequence) {
  const parts = String(projectNumber || '').split('-')
  const projNum = parts[parts.length - 1] || ''
  const year = new Date().getFullYear()
  return `AICC/MRF/${projNum}-${year}-${sequence}`
}

// ─── RFI (IF08) NUMBER — deliberate exception, same shape as genMacNumber:
// AI-<project number>-RFI-XXX (e.g. AI-0632-RFI-000). "AI" is the fixed
// company code, <project number> is the trailing segment of the project's own
// project_number, no year. RFI-only, added 2026-07-27 — other doc types are
// unaffected and still use genDocNumber above.
export function genRfiNumber(projectNumber, sequence) {
  const parts = String(projectNumber || '').split('-')
  const projNum = parts[parts.length - 1] || ''
  return `AI-${projNum}-RFI-${String(sequence).padStart(3, '0')}`
}

// ─── REVISED RFI NUMBER — not a new sequence, just a display suffix.
// A revision round's own rev_no (e.g. "R1", already stored per-round in
// if08.submission_history) is appended straight onto the RFI's existing
// genRfiNumber() output: AI-0632-RFI-001 + R1 -> AI-0632-RFI-001R1.
export function formatRevisedRfiNumber(rfiNumber, revNo) {
  if (!rfiNumber || !revNo) return rfiNumber || ''
  return `${rfiNumber}${revNo}`
}

// ─── REVISED MAC NUMBER — same idea as formatRevisedRfiNumber above, not a
// new sequence, just a display suffix appended to the MAC's existing
// genMacNumber() output. MAC's own convention is hyphenated (AI-0632-MAC-024
// + R1 -> AI-0632-MAC-024-R1), unlike RFI's un-hyphenated R1 suffix — this
// was an explicit user choice (2026-08-01), not an inconsistency to fix.
export function formatRevisedMacNumber(macNumber, revNo) {
  if (!macNumber || !revNo) return macNumber || ''
  return `${macNumber}-${revNo}`
}

// ─── SHOP DRAWING (IF04) NUMBER — same shape as genMacNumber, "SD" instead
// of "MAC": AI-<project number>-SD-XXX (e.g. AI-0632-SD-001). Replaces the
// generic genDocNumber('IF04', ...) format for new records going forward —
// existing shop drawings already numbered under the old IF04-PROJCODE-YEAR-SEQ
// format keep their historical numbers unchanged. Deliberate user choice
// (2026-08-02), following the same explicit-exception pattern as MAC/RFI/MRF.
export function genSdNumber(projectNumber, sequence) {
  const parts = String(projectNumber || '').split('-')
  const projNum = parts[parts.length - 1] || ''
  return `AI-${projNum}-SD-${String(sequence).padStart(3, '0')}`
}

// ─── REVISED SD NUMBER — same idea as formatRevisedMacNumber. The base
// if04_number can itself already carry a manual letter suffix (e.g.
// "AI-0632-SD-001a", mirroring how MAC numbers are sometimes hand-suffixed)
// — this only ever appends the revision round's rev_no on top of whatever
// that already is: AI-0632-SD-001a + R1 -> AI-0632-SD-001a-R1.
export function formatRevisedSdNumber(sdNumber, revNo) {
  if (!sdNumber || !revNo) return sdNumber || ''
  return `${sdNumber}-${revNo}`
}

// ─── DOCUMENT SUBMITTAL FORM (Document Register) NUMBER — same shape as
// genMacNumber/genSdNumber, "DSF" instead of "MAC"/"SD": AI-<project
// number>-DSF-XXX (e.g. AI-0632-DSF-001). Replaces the generic
// genDocNumber('DOC', ...) format for new records going forward — existing
// documents already numbered under the old DOC-PROJCODE-YEAR-SEQ format
// keep their historical numbers unchanged. Document Register was rebuilt
// to full MAC parity (response-code approval workflow, revision rounds,
// computed status, register PDF export, certificate print) on 2026-08-05.
export function genDsfNumber(projectNumber, sequence) {
  const parts = String(projectNumber || '').split('-')
  const projNum = parts[parts.length - 1] || ''
  return `AI-${projNum}-DSF-${String(sequence).padStart(3, '0')}`
}

// ─── REVISED DSF NUMBER — same idea as formatRevisedMacNumber/formatRevisedSdNumber.
export function formatRevisedDsfNumber(dsfNumber, revNo) {
  if (!dsfNumber || !revNo) return dsfNumber || ''
  return `${dsfNumber}-${revNo}`
}
