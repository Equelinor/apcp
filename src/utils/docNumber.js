// Document numbering engine
// Format: TYPE-PROJCODE-YEAR-SEQUENCE
// e.g. MRF-ANT-2025-00001

export const DOC_TYPES = {
  MRF: 'MRF',
  DAR: 'DAR',
  IF04: 'IF04',
  IF05: 'IF05',
  IF06: 'IF06',
  IF07: 'IF07',
  IF08: 'IF08',
  IF09: 'IF09',
  IF12: 'IF12',
  DOC: 'DOC',
  DRW: 'DRW',
}

export function generateDocNumber(type, projectCode, sequence) {
  const year = new Date().getFullYear()
  const seq = String(sequence).padStart(5, '0')
  return `${type}-${projectCode}-${year}-${seq}`
}

export function parseDocNumber(docNumber) {
  const parts = docNumber.split('-')
  if (parts.length < 4) return null
  return {
    type: parts[0],
    projectCode: parts[1],
    year: parseInt(parts[2]),
    sequence: parseInt(parts[3]),
  }
}
