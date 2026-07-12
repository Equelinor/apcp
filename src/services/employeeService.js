import { supabase } from '../supabaseClient'

const TABLE = 'employees'

export const employeeService = {
  async list() {
    const { data, error } = await supabase.from(TABLE).select('*').order('full_name')
    if (error) { console.error(error); return [] }
    return data
  },

  async get(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async getByEmployeeNo(employeeNo) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('employee_no', employeeNo).single()
    if (error) return null
    return data
  },

  // Case-insensitive exact match — used to match a free-text signer name
  // (e.g. "Prepared By" on a form) back to an Employee Register record.
  async getByFullName(fullName) {
    if (!fullName?.trim()) return null
    const { data, error } = await supabase.from(TABLE).select('*').ilike('full_name', fullName.trim()).limit(1)
    if (error || !data?.length) return null
    return data[0]
  },

  async create(employee) {
    const { data, error } = await supabase.from(TABLE).insert(employee).select().single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // Employees are never hard-deleted — only marked Inactive
  async deactivate(id) {
    return this.update(id, { status: 'Inactive' })
  },

  // For dropdowns — active employees only
  async dropdown() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, employee_no, full_name, designation')
      .eq('status', 'Active')
      .order('full_name')
    if (error) return []
    return data
  },
}
