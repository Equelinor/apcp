import { supabase } from '../supabaseClient'

const TABLE = 'role_permissions'

// The permission catalog (modules × actions) is static config (see peopleAccessConfig.js) —
// this service only manages the actual grants: which role has which module+action enabled.
export const permissionService = {
  async listForRole(roleId) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('role_id', roleId)
    if (error) return []
    return data
  },

  async listAll() {
    const { data, error } = await supabase.from(TABLE).select('*')
    if (error) return []
    return data
  },

  async grant(roleId, module, action) {
    const { error } = await supabase.from(TABLE).insert({ role_id: roleId, module, action })
    if (error && error.code !== '23505') throw error // ignore duplicate-grant conflicts
  },

  async revoke(roleId, module, action) {
    const { error } = await supabase.from(TABLE).delete()
      .eq('role_id', roleId).eq('module', module).eq('action', action)
    if (error) throw error
  },

  async toggle(roleId, module, action, allow) {
    return allow ? this.grant(roleId, module, action) : this.revoke(roleId, module, action)
  },
}
