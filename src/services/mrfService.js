import { supabase } from '../supabaseClient'
import { MRF_SEED } from '../pages/mrfs/mrfData'

const TABLE = 'mrfs'

export const mrfService = {
  async list(projectCode) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('project_code', projectCode)
      .order('date', { ascending: false })
    if (error || !data?.length) return MRF_SEED.filter(m => m.project_code === projectCode)
    return data
  },

  async get(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return MRF_SEED.find(m => m.id === id) || null
    return data
  },

  async create(mrf) {
    const { data, error } = await supabase.from(TABLE).insert(mrf).select().single()
    if (error) return { ...mrf, id: Date.now() } // fallback for seed mode
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },

  // Search within MRFs
  async search(projectCode, query) {
    const { data } = await supabase
      .from(TABLE)
      .select('*')
      .eq('project_code', projectCode)
      .or(`mrf_number.ilike.%${query}%,material_desc.ilike.%${query}%,activity_id.ilike.%${query}%,activity_name.ilike.%${query}%,location.ilike.%${query}%`)
    const q = query.toLowerCase()
    return data || MRF_SEED.filter(m =>
      m.project_code === projectCode &&
      [m.mrf_number, m.material_desc, m.activity_id, m.activity_name, m.location]
        .some(v => (v || '').toLowerCase().includes(q))
    )
  },
}
