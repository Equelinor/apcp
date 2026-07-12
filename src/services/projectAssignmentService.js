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

  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },

  // Simplified employee <-> project sync used by the Employee Register's
  // "Assigned Projects" checklist — no role/dates/reporting_to, just
  // which projects an employee is currently on. Diffs against what's
  // already stored and inserts/removes rows to match.
  async setForEmployee(employeeId, projectCodes) {
    const current = await this.listForEmployee(employeeId)
    const currentCodes = current.map(a => a.project_code)
    const toAdd = projectCodes.filter(c => !currentCodes.includes(c))
    const toRemove = current.filter(a => !projectCodes.includes(a.project_code))
    await Promise.all([
      ...toAdd.map(project_code => this.create({ employee_id: employeeId, project_code, status: 'Active' })),
      ...toRemove.map(a => this.remove(a.id)),
    ])
  },
}
