import { supabase } from '../supabaseClient'
import { MRF_SEED } from '../pages/mrfs/mrfData'
import { SUPPLIER_SEED } from './supplierService'

// Global search — Rule 5
// Searches across all tables simultaneously
// Returns results grouped by domain

export const searchService = {
  async global(projectCode, query) {
    if (!query || query.trim().length < 2) return {}
    const q = query.trim()

    const searches = await Promise.allSettled([
      searchTable('mrfs', projectCode, q, 'mrf_number,material_desc,activity_id,activity_name,location,zone'),
      searchTable('if08', projectCode, q, 'rfi_number,subject,activity_id,activity_name'),
      searchTable('if04', projectCode, q, 'if04_number,drawing_number,drawing_title,activity_id'),
      searchTable('if05', projectCode, q, 'if05_number,material_desc,brand,activity_id'),
      searchTable('if07', projectCode, q, 'if07_number,title,ref_number,activity_id'),
      searchTable('if09', projectCode, q, 'if09_number,activity_id,activity_name,location'),
      searchTable('if12', projectCode, q, 'if12_number,subcontractor_name,trade,activity_id'),
      searchTable('drawings', projectCode, q, 'drw_number,title,activity_id,discipline'),
      searchTable('documents', projectCode, q, 'doc_number,title,activity_id,category'),
      searchSuppliers(q),
    ])

    const [mrfs, rfis, shopDrawings, macs, docSubmittals, inspections, subcontractors, drawings, documents, suppliers] = searches.map(r => r.status === 'fulfilled' ? r.value : [])

    const results = {}
    if (mrfs?.length)           results['Material Requests']      = { items: mrfs,           route: '/mrfs',           numberField: 'mrf_number' }
    if (rfis?.length)           results['RFI']                    = { items: rfis,            route: '/rfi',            numberField: 'rfi_number' }
    if (shopDrawings?.length)   results['Shop Drawings']          = { items: shopDrawings,    route: '/shop-drawings',  numberField: 'if04_number' }
    if (macs?.length)           results['Material Approvals']     = { items: macs,            route: '/mac',            numberField: 'if05_number' }
    if (docSubmittals?.length)  results['Doc Submittals']         = { items: docSubmittals,   route: '/submittals',     numberField: 'if07_number' }
    if (inspections?.length)    results['Inspections']            = { items: inspections,     route: '/ir',             numberField: 'if09_number' }
    if (subcontractors?.length) results['Sub-contractors']        = { items: subcontractors,  route: '/subcontractor',  numberField: 'if12_number' }
    if (drawings?.length)       results['Drawing Register']       = { items: drawings,        route: '/drawing-register', numberField: 'drw_number' }
    if (documents?.length)      results['Document Register']      = { items: documents,       route: '/document-register', numberField: 'doc_number' }
    if (suppliers?.length)      results['Suppliers']              = { items: suppliers,       route: '/suppliers',      numberField: 'supplier_code' }

    return results
  },
}

async function searchTable(table, projectCode, query, fields) {
  const orClauses = fields.split(',').map(f => `${f.trim()}.ilike.%${query}%`).join(',')
  const { data } = await supabase
    .from(table)
    .select('*')
    .eq('project_code', projectCode)
    .or(orClauses)
    .limit(5)
  return data || []
}

async function searchSuppliers(query) {
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .or(`supplier_name.ilike.%${query}%,supplier_code.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(5)
  if (data?.length) return data
  const q = query.toLowerCase()
  return SUPPLIER_SEED.filter(s =>
    [s.supplier_name, s.supplier_code, s.category].some(v => (v || '').toLowerCase().includes(q))
  )
}
