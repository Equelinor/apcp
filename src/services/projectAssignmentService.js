import { supabase } from '../supabaseClient'

const TABLE = 'project_assignments'

export const projectAssignmentService = {
  async listForProject(projectCode) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('project_code', projectCode).order('created_at')
    if (error) return []
    return data
  },

  async listForEmployee(employeeId) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('employee_id', employeeId).order('created_at')
    if (error) return []
    return data
  },

  async create(assignment) {
    const { data, error } = await supabase.from(TABLE).insert(assignment).select().single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async end(id) {
    return this.update(id, { status: 'Ended', end_date: new Date().toISOString().slice(0, 10) })
  },
}
