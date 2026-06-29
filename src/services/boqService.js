import { supabase } from '../supabaseClient'

const ITEMS_TABLE    = 'boq_items'
const SECTIONS_TABLE = 'boq_sections'
const UPDATES_TABLE  = 'boq_progress_updates'

export const BOQ_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'N/A']
export const BOQ_TRADES   = ['Civil/Structural', 'Architectural', 'MEP', 'Electrical', 'Mechanical', 'Plumbing', 'HVAC', 'Fire Fighting', 'ELV', 'External Works', 'Preliminaries', 'Provisional', 'Other']

export const BLANK_ITEM = {
  item_no: '', description: '', unit: '', quantity: '', rate: '', amount: '',
  trade: '', remarks: '', section_code: '', linked_activity: '',
  completed_qty: 0, progress_pct: 0, completed_value: 0, balance_value: 0,
  status: 'Not Started',
}

export const boqService = {
  // ── Sections ─────────────────────────────────────────────
  async listSections(projectCode) {
    const { data, error } = await supabase
      .from(SECTIONS_TABLE)
      .select('*')
      .eq('project_code', projectCode)
      .order('sort_order')
    if (error) { console.error(error); return [] }
    return data || []
  },

  async upsertSection(section) {
    const { data, error } = await supabase
      .from(SECTIONS_TABLE)
      .upsert(section, { onConflict: 'project_code,section_code' })
      .select().single()
    if (error) throw error
    return data
  },

  // ── Items ─────────────────────────────────────────────────
  async listItems(projectCode, sectionCode = null) {
    let q = supabase.from(ITEMS_TABLE).select('*').eq('project_code', projectCode)
    if (sectionCode) q = q.eq('section_code', sectionCode)
    const { data, error } = await q.order('item_no')
    if (error) { console.error(error); return [] }
    return data || []
  },

  async upsertItem(item) {
    const { data, error } = await supabase
      .from(ITEMS_TABLE)
      .upsert(item, { onConflict: 'project_code,item_no' })
      .select().single()
    if (error) throw error
    return data
  },

  async updateItem(id, updates) {
    const { data, error } = await supabase
      .from(ITEMS_TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async deleteItem(id) {
    const { error } = await supabase.from(ITEMS_TABLE).delete().eq('id', id)
    if (error) throw error
  },

  // ── Progress update ───────────────────────────────────────
  async updateProgress(item, { completedQty, progressPct }, updatedBy = '') {
    let newQty = completedQty !== undefined ? Number(completedQty) : null
    let newPct = progressPct  !== undefined ? Number(progressPct)  : null

    const qty   = Number(item.quantity) || 0
    const rate  = Number(item.rate)     || 0
    const amt   = Number(item.amount)   || (qty * rate)

    // Derive the other if only one given
    if (newQty !== null && newPct === null) {
      newPct = qty > 0 ? Math.min(100, (newQty / qty) * 100) : 0
    } else if (newPct !== null && newQty === null) {
      newQty = (newPct / 100) * qty
    }

    newPct = Math.min(100, Math.max(0, newPct || 0))
    newQty = Math.max(0, newQty || 0)

    const completedValue = (newPct / 100) * amt
    const balanceValue   = amt - completedValue
    const status = newPct === 0 ? 'Not Started' : newPct >= 100 ? 'Completed' : 'In Progress'

    // Log the update
    await supabase.from(UPDATES_TABLE).insert({
      boq_item_id: item.id,
      project_code: item.project_code,
      updated_by: updatedBy,
      prev_pct: item.progress_pct,
      new_pct: newPct,
      prev_qty: item.completed_qty,
      new_qty: newQty,
    })

    // Update item
    const updated = await this.updateItem(item.id, {
      completed_qty: newQty,
      progress_pct: newPct,
      completed_value: completedValue,
      balance_value: balanceValue,
      status,
    })

    // Recalculate section progress
    await this.recalcSection(item.project_code, item.section_code)

    return updated
  },

  // ── Section roll-up ───────────────────────────────────────
  async recalcSection(projectCode, sectionCode) {
    const items = await this.listItems(projectCode, sectionCode)
    const totalAmt     = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const completedVal = items.reduce((s, i) => s + (Number(i.completed_value) || 0), 0)
    const pct = totalAmt > 0 ? (completedVal / totalAmt) * 100 : 0

    await supabase.from(SECTIONS_TABLE)
      .update({ total_amount: totalAmt, completed_value: completedVal, progress_pct: pct })
      .eq('project_code', projectCode)
      .eq('section_code', sectionCode)
  },

  // ── Dashboard KPIs ────────────────────────────────────────
  async getDashboard(projectCode) {
    const [sections, items] = await Promise.all([
      this.listSections(projectCode),
      this.listItems(projectCode),
    ])

    const totalValue     = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const completedValue = items.reduce((s, i) => s + (Number(i.completed_value) || 0), 0)
    const balanceValue   = totalValue - completedValue
    const overallPct     = totalValue > 0 ? (completedValue / totalValue) * 100 : 0
    const itemCount      = items.length
    const notStarted     = items.filter(i => i.status === 'Not Started').length
    const inProgress     = items.filter(i => i.status === 'In Progress').length
    const completed      = items.filter(i => i.status === 'Completed').length

    // Top zero-progress high-value items
    const zeroHighValue = [...items]
      .filter(i => (Number(i.progress_pct) || 0) === 0 && (Number(i.amount) || 0) > 0)
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)

    return { sections, items, totalValue, completedValue, balanceValue, overallPct, itemCount, notStarted, inProgress, completed, zeroHighValue }
  },

  // ── Bulk insert (from import) ─────────────────────────────
  async bulkInsert(projectCode, sections, items) {
    // Upsert sections first
    for (const sec of sections) {
      await this.upsertSection({ ...sec, project_code: projectCode })
    }
    // Upsert items
    if (items.length > 0) {
      const { error } = await supabase.from(ITEMS_TABLE).upsert(
        items.map(i => ({ ...i, project_code: projectCode })),
        { onConflict: 'project_code,item_no' }
      )
      if (error) throw error
    }
    // Recalc all sections
    const sectionCodes = [...new Set(items.map(i => i.section_code))]
    for (const code of sectionCodes) {
      await this.recalcSection(projectCode, code)
    }
  },
}
