// ─── APCP NUMBERING ENGINE ───────────────────────────────────────
// Rule 4: One numbering engine. All document numbers generated here.
// Format: PROJCODE-TYPE-SEQUENCE e.g. ANT-MRF-00001

export const DOC_TYPES = {
  MRF:  { code: 'MRF',  label: 'Material Request Form',        color: '#1E40AF' },
  PO:   { code: 'PO',   label: 'Purchase Order',               color: '#065F46' },
  DN:   { code: 'DN',   label: 'Delivery Note',                color: '#065F46' },
  MIR:  { code: 'MIR',  label: 'Material Inspection Request',  color: '#5B21B6' },
  DRW:  { code: 'DRW',  label: 'Drawing',                      color: '#1E40AF' },
  DOC:  { code: 'DOC',  label: 'Document',                     color: '#5B21B6' },
  IF04: { code: 'IF04', label: 'Shop Drawing Submittal',       color: '#065F46' },
  IF05: { code: 'MAC',  label: 'Material Approval Certificate',color: '#92400E' },
  IF06: { code: 'MUI',  label: 'Mock-up Inspection',           color: '#1558A0' },
  IF07: { code: 'DS',   label: 'Document Submittal',           color: '#5B21B6' },
  IF08: { code: 'RFI',  label: 'Request For Information',      color: '#B91C1C' },
  IF09: { code: 'IR',   label: 'Inspection Request',           color: '#065F46' },
  IF12: { code: 'SCA',  label: 'Sub-contractor Approval',      color: '#92400E' },
  DAR:  { code: 'DAR',  label: 'Daily Activity Report',        color: '#0F766E' },
  NCR:  { code: 'NCR',  label: 'Non-Conformance Report',       color: '#B91C1C' },
  SOR:  { code: 'SOR',  label: 'Site Observation Report',      color: '#92400E' },
  SUP:  { code: 'SUP',  label: 'Supplier',                     color: '#374151' },
}

// Generate a document number
// Returns: PROJCODE-TYPE-SEQUENCE e.g. ANT-MRF-00001
export function generateNumber(projectCode, typeKey, sequence) {
  const type = DOC_TYPES[typeKey]
  const code = type?.code || typeKey
  const seq = String(sequence).padStart(5, '0')
  return `${projectCode}-${code}-${seq}`
}

// Parse a document number back to parts
export function parseNumber(docNumber) {
  const parts = docNumber.split('-')
  if (parts.length < 3) return null
  return {
    projectCode: parts[0],
    typeCode: parts[1],
    sequence: parseInt(parts[2]),
  }
}

// Get next sequence number from an existing list of records
export function nextSequence(records, numberField) {
  if (!records?.length) return 1
  const nums = records
    .map(r => {
      const parsed = parseNumber(r[numberField] || '')
      return parsed?.sequence || 0
    })
    .filter(n => !isNaN(n))
  return nums.length ? Math.max(...nums) + 1 : 1
}
