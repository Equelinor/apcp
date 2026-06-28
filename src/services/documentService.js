import { supabase } from '../supabaseClient'

// Generic service factory for document-type tables
function makeDocService(table, numberField, seed = []) {
  return {
    async list(projectCode) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('project_code', projectCode)
        .order(numberField, { ascending: false })
      if (error || !data?.length) return seed.filter(d => d.project_code === projectCode)
      return data
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
      if (error) return seed.find(d => d.id === id) || null
      return data
    },

    async create(record) {
      const { data, error } = await supabase.from(table).insert(record).select().single()
      if (error) return { ...record, id: Date.now() }
      return data
    },

    async update(id, updates) {
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },

    async search(projectCode, query) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('project_code', projectCode)
        .or(`${numberField}.ilike.%${query}%,activity_id.ilike.%${query}%,activity_name.ilike.%${query}%`)
      const q = query.toLowerCase()
      return data || seed.filter(d =>
        d.project_code === projectCode &&
        Object.values(d).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
      )
    },
  }
}

export const drawingService  = makeDocService('drawings',  'drw_number')
export const documentService = makeDocService('documents', 'doc_number')
export const if04Service     = makeDocService('if04',      'if04_number')
export const if05Service     = makeDocService('if05',      'if05_number')
export const if06Service     = makeDocService('if06',      'if06_number')
export const if07Service     = makeDocService('if07',      'if07_number')
export const if08Service     = makeDocService('if08',      'rfi_number')
export const if09Service     = makeDocService('if09',      'if09_number')
export const if12Service     = makeDocService('if12',      'if12_number')
