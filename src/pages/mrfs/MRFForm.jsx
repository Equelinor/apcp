import { useState, useEffect } from 'react'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { calcLatestRaiseDate, today } from '../../utils/delay'
import { LOCATIONS, ZONES, UNITS, PRIORITIES, SUBM_STATUSES } from './mrfData'

const BLANK = {
  date: today(),
  location: '', zone: '', requested_by: '', priority: 'Medium',
  material_desc: '', material_code: '', qty: '', unit: 'NOS', required_on_site: '',
  lead_time_days: '', latest_raise_date: '', related_activity: '', remarks: '',
  mat_spec: '', brand: '', grade: '', code_ref: '',
  sample_ref: '', subm_ref: '', subm_status: 'Pending', consult_approval_date: '',
  ifc_drawing: '', shop_drawing: '', drawing_rev: '',
  wbs_code: '', activity_id: '', activity_name: '', programme_ref: '',
  planned_start: '', planned_finish: '',
  tender_allowance: '', additional_qty: '', unit_rate: '', total_amount: '',
}

export default function MRFForm({ initial, mrfNumber, onSave, onCancel }) {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const [form, setForm] = useState({ ...BLANK, ...(initial || {}) })
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Auto-calc latest raise date
  useEffect(() => {
    if (form.required_on_site && form.lead_time_days) {
      const lrd = calcLatestRaiseDate(form.required_on_site, form.lead_time_days)
      setForm(f => ({ ...f, latest_raise_date: lrd }))
    }
  }, [form.required_on_site, form.lead_time_days])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function validate() {
    const required = ['material_desc', 'qty', 'unit', 'required_on_site', 'priority', 'location']
    for (const f of required) {
      if (!form[f]) { alert(`Required: ${f.replace(/_/g, ' ')}`); return false }
    }
    return true
  }

  function handleSave(status) {
    if (!validate()) return
    onSave({ ...form, approval_status: status, project_code: activeProject.project_code })
  }

  const delayWarning = form.required_on_site && form.lead_time_days && form.latest_raise_date &&
    new Date(form.latest_raise_date) < new Date()

  return (
    <div>
      {/* ─── SECTION 1: Core Info ─── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', paddingBottom: 9, borderBottom: '1px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 18, height: 18, background: 'var(--brand-primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>1</span>
          Request Details
        </div>
        <div className="form-grid form-grid-4" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">MRF Number</label>
            <div style={{ padding: '8px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--brand-accent)', fontWeight: 700 }}>
              {mrfNumber || 'Auto-generated'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label required">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label required">Priority</label>
            <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Requested By</label>
            <input className="form-input" value={form.requested_by} onChange={e => set('requested_by', e.target.value)} placeholder="Name" />
          </div>
        </div>
        <div className="form-grid form-grid-3" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label required">Location</label>
            <select className="form-select" value={form.location} onChange={e => set('location', e.target.value)}>
              <option value="">— Select —</option>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Zone / Level</label>
            <select className="form-select" value={form.zone} onChange={e => set('zone', e.target.value)}>
              <option value="">— Select —</option>
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Related Activity</label>
            <input className="form-input" value={form.related_activity} onChange={e => set('related_activity', e.target.value)} placeholder="Activity description" />
          </div>
        </div>
        <div className="form-grid form-grid-4" style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ gridColumn: '1 / span 3' }}>
            <label className="form-label required">Material Description</label>
            <input className="form-input" value={form.material_desc} onChange={e => set('material_desc', e.target.value)} placeholder="Full material description, type, grade, size…" />
          </div>
          <div className="form-group">
            <label className="form-label">Material Code</label>
            <input className="form-input" value={form.material_code} onChange={e => set('material_code', e.target.value)} />
          </div>
        </div>
        <div className="form-grid form-grid-4" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label required">Quantity</label>
            <input className="form-input" type="number" value={form.qty} onChange={e => set('qty', e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label required">Unit</label>
            <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Required On-Site</label>
            <input className="form-input" type="date" value={form.required_on_site} onChange={e => set('required_on_site', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Lead Time (days)</label>
            <input className="form-input" type="number" value={form.lead_time_days} onChange={e => set('lead_time_days', e.target.value)} min="0" placeholder="Auto-calcs raise date" />
          </div>
        </div>
        <div className="form-grid form-grid-4" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Tender Allowance</label>
            <input className="form-input" type="number" value={form.tender_allowance} onChange={e => set('tender_allowance', e.target.value)} min="0" placeholder="AICC Tender Qty Allowance" />
          </div>
          <div className="form-group">
            <label className="form-label">Additional Qty</label>
            <input className="form-input" type="number" value={form.additional_qty} onChange={e => set('additional_qty', e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Unit Rate</label>
            <input className="form-input" type="number" value={form.unit_rate} onChange={e => set('unit_rate', e.target.value)} min="0" step="0.01" />
          </div>
          <div className="form-group">
            <label className="form-label">Total Amount</label>
            <input className="form-input" type="number" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} min="0" step="0.01" />
          </div>
        </div>
        {form.latest_raise_date && (
          <div style={{
            background: delayWarning ? 'var(--status-rejected-bg)' : 'var(--status-approved-bg)',
            color: delayWarning ? 'var(--status-rejected-text)' : 'var(--status-approved-text)',
            border: `1px solid ${delayWarning ? '#fca5a5' : '#a7f3d0'}`,
            borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12
          }}>
            {delayWarning ? '⚠️' : '✓'} Latest Raise Date: {form.latest_raise_date}
            {delayWarning && ' — PAST DUE. Raise MRF immediately.'}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea className="form-textarea" value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} placeholder="Special instructions, notes…" />
        </div>
      </div>

      {/* ─── ADVANCED TOGGLE ─── */}
      <button
        onClick={() => setShowAdvanced(p => !p)}
        style={{
          width: '100%', padding: '9px', background: 'var(--bg-base)',
          border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
          marginBottom: showAdvanced ? 20 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
        }}
      >
        {showAdvanced ? '▲ Hide Advanced Details' : '▼ Show Advanced Details (Material Spec, Drawing Refs, Programme)'}
      </button>

      {showAdvanced && (
        <>
          {/* ─── SECTION 2: Material Spec ─── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', paddingBottom: 9, borderBottom: '1px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 18, height: 18, background: 'var(--brand-primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>2</span>
              Material Specification
            </div>
            <div className="form-grid form-grid-4" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Material Spec</label>
                <input className="form-input" value={form.mat_spec} onChange={e => set('mat_spec', e.target.value)} placeholder="Grade / Type" />
              </div>
              <div className="form-group">
                <label className="form-label">Brand / Manufacturer</label>
                <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Grade</label>
                <input className="form-input" value={form.grade} onChange={e => set('grade', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Code / Standard Ref</label>
                <input className="form-input" value={form.code_ref} onChange={e => set('code_ref', e.target.value)} placeholder="ASTM / BS / ISO" />
              </div>
            </div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Sample Ref</label>
                <input className="form-input" value={form.sample_ref} onChange={e => set('sample_ref', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Submittal Ref</label>
                <input className="form-input" value={form.subm_ref} onChange={e => set('subm_ref', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Submittal Status</label>
                <select className="form-select" value={form.subm_status} onChange={e => set('subm_status', e.target.value)}>
                  {SUBM_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ─── SECTION 3: Drawing Refs ─── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', paddingBottom: 9, borderBottom: '1px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 18, height: 18, background: 'var(--brand-primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>3</span>
              Drawing References
            </div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">IFC Drawing No.</label>
                <input className="form-input" value={form.ifc_drawing} onChange={e => set('ifc_drawing', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Shop Drawing No.</label>
                <input className="form-input" value={form.shop_drawing} onChange={e => set('shop_drawing', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Drawing Revision</label>
                <input className="form-input" value={form.drawing_rev} onChange={e => set('drawing_rev', e.target.value)} placeholder="Rev 01" />
              </div>
            </div>
          </div>

          {/* ─── SECTION 4: Programme Link ─── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', paddingBottom: 9, borderBottom: '1px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 18, height: 18, background: 'var(--brand-primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>4</span>
              Programme Link (Primavera / P6)
            </div>
            <div className="form-grid form-grid-4" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">WBS Code</label>
                <input className="form-input" value={form.wbs_code} onChange={e => set('wbs_code', e.target.value)} placeholder="1.2.3" />
              </div>
              <div className="form-group">
                <label className="form-label">Activity ID</label>
                <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010" />
              </div>
              <div className="form-group">
                <label className="form-label">Activity Name</label>
                <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Programme Ref</label>
                <input className="form-input" value={form.programme_ref} onChange={e => set('programme_ref', e.target.value)} />
              </div>
            </div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Planned Start</label>
                <input className="form-input" type="date" value={form.planned_start} onChange={e => set('planned_start', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Planned Finish</label>
                <input className="form-input" type="date" value={form.planned_finish} onChange={e => set('planned_finish', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Consultant Approval Date</label>
                <input className="form-input" type="date" value={form.consult_approval_date} onChange={e => set('consult_approval_date', e.target.value)} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── FOOTER ACTIONS ─── */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-secondary" onClick={() => handleSave('Draft')}>Save Draft</button>
        <button className="btn btn-primary" onClick={() => handleSave('Submitted')}>Submit for Approval</button>
      </div>
    </div>
  )
}
