import { supabase } from '../supabaseClient'
import { DEFAULT_ROLES } from '../config/peopleAccessConfig'

const TABLE = 'roles'

export const roleService = {
  async list() {
    const { data, error } = await supabase.from(TABLE).select('*').order('name')
    if (error || !data?.length) return DEFAULT_ROLES.map(name => ({ name, description: '', is_system: true }))
    return data
  },

  async create(role) {
    const { data, error } = await supabase.from(TABLE).insert(role).select().single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // Roles are reference data used elsewhere (profiles.role, project_assignments.project_role) —
  // never hard-delete a role that's in use; caller should check before calling this.
  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}
