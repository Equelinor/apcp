import { supabase } from '../supabaseClient'

const TABLE = 'suppliers'

// Seed data — used when Supabase table is empty
export const SUPPLIER_SEED = [
  { id: 1, supplier_code: 'SUP-00001', supplier_name: 'Gulf Concrete Co.', contact_person: 'Mohammed Al-Farid', phone: '+971-50-1234567', email: 'info@gulfconcrete.ae', category: 'Concrete & Aggregates', address: 'Industrial Area, Dubai, UAE', status: 'Active', remarks: 'Primary concrete supplier — ANT project' },
  { id: 2, supplier_code: 'SUP-00002', supplier_name: 'Emirates Steel', contact_person: 'Rajan Kumar', phone: '+971-2-5551234', email: 'sales@emiratessteel.com', category: 'Steel & Rebar', address: 'Abu Dhabi, UAE', status: 'Active', remarks: 'Mill certs required on every delivery' },
  { id: 3, supplier_code: 'SUP-00003', supplier_name: 'Armacell Gulf', contact_person: 'James Wu', phone: '+971-4-8881234', email: 'gulf@armacell.com', category: 'MEP Materials', address: 'Jebel Ali, Dubai, UAE', status: 'Active', remarks: '' },
  { id: 4, supplier_code: 'SUP-00004', supplier_name: 'Sika Gulf', contact_person: 'Sara Ahmed', phone: '+971-4-8039000', email: 'gulf@sika.com', category: 'Waterproofing', address: 'Dubai Investment Park, UAE', status: 'Active', remarks: 'Approved by consultant for waterproofing works' },
]

export const supplierService = {
  async list() {
    const { data, error } = await supabase.from(TABLE).select('*').order('supplier_name')
    if (error || !data?.length) return SUPPLIER_SEED
    return data
  },

  async get(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return SUPPLIER_SEED.find(s => s.id === id) || null
    return data
  },

  async create(supplier) {
    const { data, error } = await supabase.from(TABLE).insert(supplier).select().single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async search(query) {
    const { data } = await supabase
      .from(TABLE)
      .select('*')
      .or(`supplier_name.ilike.%${query}%,supplier_code.ilike.%${query}%,category.ilike.%${query}%`)
    return data || SUPPLIER_SEED.filter(s =>
      s.supplier_name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
    )
  },

  // For dropdowns — returns id, code, name only
  async dropdown() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, supplier_code, supplier_name, category')
      .eq('status', 'Active')
      .order('supplier_name')
    if (error || !data?.length) return SUPPLIER_SEED.map(s => ({ id: s.id, supplier_code: s.supplier_code, supplier_name: s.supplier_name, category: s.category }))
    return data
  },
}
