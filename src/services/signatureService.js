import { supabase } from '../supabaseClient'

const TABLE = 'employee_signatures'

// Digital signatures — structure only. Not applied to any PDF output yet;
// prepared so future print templates can show Name / Designation / Signature / Date.
export const signatureService = {
  async getForEmployee(employeeId) {
    const { data, error } = await supabase
      .from(TABLE).select('*')
      .eq('employee_id', employeeId).eq('active', true)
      .order('uploaded_date', { ascending: false })
      .limit(1).single()
    if (error) return null
    return data
  },

  async listAll() {
    const { data, error } = await supabase.from(TABLE).select('*').order('uploaded_date', { ascending: false })
    if (error) return []
    return data
  },

  async upload(employeeId, signatureImage, uploadedBy) {
    // deactivate any previous signature for this employee, then insert the new one as active
    await supabase.from(TABLE).update({ active: false }).eq('employee_id', employeeId)
    const { data, error } = await supabase.from(TABLE).insert({
      employee_id: employeeId,
      signature_image: signatureImage,
      uploaded_by: uploadedBy || '',
      active: true,
    }).select().single()
    if (error) throw error
    return data
  },

  async deactivate(id) {
    const { error } = await supabase.from(TABLE).update({ active: false }).eq('id', id)
    if (error) throw error
  },
}
