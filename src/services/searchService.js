import { supabase } from '../supabaseClient'
import { MRF_SEED } from '../pages/mrfs/mrfData'
import { SUPPLIER_SEED } from './supplierService'

// ─── RANKED GLOBAL SEARCH — Rule 5 ───────────────────────────────
// Score 10 — exact document number match
// Score 8  — exact activity ID match
// Score 6  — primary descriptor match (material, subject, title)
// Score 4  — supplier / sub-contractor name match
// Score 2  — any other field match

function scoreItem(item, query, numberField) {
  const q = query.toLowerCase()
  const num = (item[numberField] || '').toLowerCase()
  const actId = (item.activity_id || '').toLowerCase()
  const desc = [
    item.material_desc, item.subject, item.title, item.drawing_title,
    item.supplier_name, item.subcontractor_name, item.mockup_desc,
    item.description, item.project_name,
  ].filter(Boolean).map(v => v.toLowerCase())

  if (num === q || num.startsWith(q)) return 10
  if (actId === q) return 8
  if (desc.some(d => d.includes(q))) return 6
  if ((item.supplier_name || item.subcontractor_name || '').toLowerCase().includes(q)) return 4
  return 2
}

async function searchTable(table, projectCode, query, fields, numberField) {
  const orClauses = fields.split(',').map(f => `${f.trim()}.ilike.%${query}%`).join(',')
  try {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('project_code', projectCode)
      .or(orClauses)
      .limit(8)
    return (data || []).map(item => ({
      ...item,
      _score: scoreItem(item, query, numberField),
      _numberField: numberField,
    }))
  } catch {
    return []
  }
}

async function searchSuppliers(query) {
  try {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .or(`supplier_name.ilike.%${query}%,supplier_code.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(5)
    if (data?.length) return data.map(item => ({ ...item, _score: scoreItem(item, query, 'supplier_code'), _numberField: 'supplier_code' }))
  } catch {}
  const q = query.toLowerCase()
  return SUPPLIER_SEED
    .filter(s => [s.supplier_name, s.supplier_code, s.category].some(v => (v || '').toLowerCase().includes(q)))
    .map(item => ({ ...item, _score: scoreItem(item, query, 'supplier_code'), _numberField: 'supplier_code' }))
}

async function searchProjects(query) {
  try {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .or(`project_name.ilike.%${query}%,project_code.ilike.%${query}%,client.ilike.%${query}%`)
      .limit(3)
    return (data || []).map(item => ({ ...item, _score: scoreItem(item, query, 'project_code'), _numberField: 'project_code' }))
  } catch {
    return []
  }
}

export const searchService = {
  async global(projectCode, query) {
    if (!query || query.trim().length < 2) return []
    const q = query.trim()

    const [mrfs, rfis, shopDrawings, macs, docSubmittals, inspections,
           subcontractors, drawings, documents, suppliers, projects] = await Promise.all([
      searchTable('mrfs',      projectCode, q, 'mrf_number,material_desc,activity_id,activity_name,location',    'mrf_number'),
      searchTable('if08',      projectCode, q, 'rfi_number,subject,activity_id,activity_name',                    'rfi_number'),
      searchTable('if04',      projectCode, q, 'if04_number,drawing_number,drawing_title,activity_id',            'if04_number'),
      searchTable('if05',      projectCode, q, 'if05_number,material_desc,brand,activity_id',                     'if05_number'),
      searchTable('if07',      projectCode, q, 'if07_number,title,ref_number,activity_id',                        'if07_number'),
      searchTable('if09',      projectCode, q, 'if09_number,activity_id,activity_name,location',                  'if09_number'),
      searchTable('if12',      projectCode, q, 'if12_number,subcontractor_name,trade,activity_id',                'if12_number'),
      searchTable('drawings',  projectCode, q, 'drw_number,title,activity_id,discipline',                         'drw_number'),
      searchTable('documents', projectCode, q, 'doc_number,title,activity_id,category',                          'doc_number'),
      searchSuppliers(q),
      searchProjects(q),
    ])

    // Combine all results with domain labels and routes
    const all = [
      ...mrfs.map(i => ({ ...i, _domain: 'Material Requests', _route: '/mrfs' })),
      ...rfis.map(i => ({ ...i, _domain: 'RFI', _route: '/rfi' })),
      ...shopDrawings.map(i => ({ ...i, _domain: 'Shop Drawings', _route: '/shop-drawings' })),
      ...macs.map(i => ({ ...i, _domain: 'Material Approvals', _route: '/mac' })),
      ...docSubmittals.map(i => ({ ...i, _domain: 'Doc Submittals', _route: '/submittals' })),
      ...inspections.map(i => ({ ...i, _domain: 'Inspections', _route: '/ir' })),
      ...subcontractors.map(i => ({ ...i, _domain: 'Sub-contractors', _route: '/subcontractor' })),
      ...drawings.map(i => ({ ...i, _domain: 'Drawing Register', _route: '/drawing-register' })),
      ...documents.map(i => ({ ...i, _domain: 'Doc Register', _route: '/document-register' })),
      ...suppliers.map(i => ({ ...i, _domain: 'Suppliers', _route: '/suppliers' })),
      ...projects.map(i => ({ ...i, _domain: 'Projects', _route: '/projects' })),
    ]

    // Sort by score descending — highest confidence first
    return all.sort((a, b) => b._score - a._score).slice(0, 20)
  },
}
