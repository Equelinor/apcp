import { supabase } from '../supabaseClient'
import { generateNumber, nextSequence } from '../models/Numbering'

// Table → number field mapping
const TABLE_NUMBER_FIELD = {
  mrfs:      'mrf_number',
  if04:      'if04_number',
  if05:      'if05_number',
  if06:      'if06_number',
  if07:      'if07_number',
  if08:      'rfi_number',
  if09:      'if09_number',
  if12:      'if12_number',
  drawings:  'drw_number',
  documents: 'doc_number',
  suppliers: 'supplier_code',
  dars:      'dar_number',
}

// Get next number for a given table + project + type
export async function getNextNumber(table, typeKey, projectCode, localRecords = null) {
  const numberField = TABLE_NUMBER_FIELD[table]
  if (!numberField) throw new Error(`Unknown table: ${table}`)

  // If we have local records (seed data fallback), use them
  if (localRecords?.length) {
    const seq = nextSequence(localRecords.filter(r => r.project_code === projectCode), numberField)
    return generateNumber(projectCode, typeKey, seq)
  }

  // Query Supabase for the latest sequence
  const { data, error } = await supabase
    .from(table)
    .select(numberField)
    .eq('project_code', projectCode)
    .order(numberField, { ascending: false })
    .limit(1)

  if (error) {
    console.warn(`numberingService: fallback to seq 1 for ${table}`, error)
    return generateNumber(projectCode, typeKey, 1)
  }

  const seq = data?.length
    ? (parseInt(data[0][numberField]?.split('-').pop()) || 0) + 1
    : 1

  return generateNumber(projectCode, typeKey, seq)
}
