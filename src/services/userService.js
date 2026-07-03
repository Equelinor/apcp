import { supabase } from '../supabaseClient'

const TABLE = 'profiles'

// ── User Accounts ──────────────────────────────────────────
// A "user account" IS a row in `profiles` (1:1 with Supabase Auth). There is no
// separate pending/invite table — a person doesn't have an account until they've
// signed up (see signUp below). Admin manages role/employee-link/status afterward.
export const userService = {
  async list() {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false })
    if (error) { console.error(error); return [] }
    return data
  },

  async get(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async setRole(id, role) {
    return this.update(id, { role })
  },

  async setAccountStatus(id, account_status) {
    return this.update(id, { account_status })
  },

  async linkEmployee(id, employee_id) {
    return this.update(id, { employee_id })
  },

  // ── Auth actions — all client-safe (anon key), no service_role needed ──

  // Self-service account creation. Blocks (client-side check only — RLS is off
  // project-wide, see memory) unless the email matches a known employee record,
  // so random signups can't grant themselves access.
  async signUp({ email, password, matchedEmployee }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const userId = data.user?.id
    if (userId) {
      await supabase.from(TABLE).insert({
        id: userId,
        name: matchedEmployee?.full_name || email,
        email,
        role: 'Viewer', // safe default — Admin upgrades the real role afterward
        employee_id: matchedEmployee?.id || null,
        account_status: 'Active',
      })
    }
    return data
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  },

  async recordLogin(id) {
    await supabase.from(TABLE).update({ last_login: new Date().toISOString() }).eq('id', id)
  },
}
