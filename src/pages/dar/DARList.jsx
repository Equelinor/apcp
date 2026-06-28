import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { generateNumber } from '../../models/Numbering'
import { STATUS, STATUS_FLOW } from '../../models/Status'
import { getDisciplines } from '../../constants/disciplines'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, Printer, ChevronDown, ChevronUp } from 'lucide-react'
import { today } from '../../utils/delay'
import { buildDAR, printForm, mergeProjectLogos } from '../../utils/printEngine'

const WEATHER = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Sandstorm', 'Humid', 'Extreme Heat']
const SHIFT = ['Day Shift', 'Night Shift', 'Double Shift']

const BLANK_DAR = {
  date: today(),
  shift: 'Day Shift',
  weather: 'Clear',
  temperature: '',
  prepared_by: '',
  reviewed_by: '',
  status: STATUS.DRAFT,
  general_remarks: '',
  activities: [],
  labour: [],
  equipment: [],
  visitors: [],
  issues: [],
}

const BLANK_ACTIVITY = {
  activity_id: '', activity_name: '', wbs_code: '',
  location: '', zone: '', discipline: '',
  description: '', planned_qty: '', actual_qty: '', unit: '', progress_pct: '',
  remarks: '',
}

const BLANK_LABOUR = { trade: '', subcontractor: '', count: '', remarks: '' }
const BLANK_EQUIPMENT = { type: '', id_number: '', quantity: 1, status: 'Working', remarks: '' }
const BLANK_VISITOR = { name: '', company: '', purpose: '', time_in: '', time_out: '' }
const BLANK_ISSUE = { description: '', raised_by: '', action_required: '', status: 'Open' }

const SEED = [
  {
    id: 1, dar_number: 'ANT-DAR-00001', date: '2025-01-22', project_code: 'ANT',
    shift: 'Day Shift', weather: 'Clear', temperature: '28',
    prepared_by: 'Ahmed Al-Rashid', reviewed_by: 'Omar Shaikh',
    status: STATUS.APPROVED, general_remarks: 'Productive day. Foundation pour completed.',
    activities: [
      { activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', location: 'Block A', zone: 'Basement', discipline: 'Civil / Structural', description: 'Concrete pour for pile cap PC-01 to PC-12', planned_qty: 500, actual_qty: 500, unit: 'CUM', progress_pct: 100, remarks: 'Completed on schedule' },
    ],
    labour: [
      { trade: 'Concretor', subcontractor: 'Gulf Concrete Services', count: 24, remarks: '' },
      { trade: 'Steel Fixer', subcontractor: 'Direct Labour', count: 12, remarks: '' },
    ],
    equipment: [
      { type: 'Mobile Crane', id_number: 'CR-01', quantity: 1, status: 'Working', remarks: '' },
      { type: 'Concrete Pump', id_number: 'CP-01', quantity: 1, status: 'Working', remarks: '' },
    ],
    visitors: [{ name: 'Omar Shaikh', company: 'Axion', purpose: 'Site Inspection', time_in: '09:00', time_out: '11:30' }],
    issues: [],
  },
]

export default function DARList() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const disciplines = getDisciplines(activeProject.code)

  const [dars, setDars] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK_DAR)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedSections, setExpandedSections] = useState({ activities: true, labour: true, equipment: false, visitors: false, issues: false })

  const canCreate = ['Admin', 'PM', 'Site Engineer', 'Planning'].includes(profile?.role)
  const canApprove = ['Admin', 'PM'].includes(profile?.role)

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('dars')
      .select('*')
      .eq('project_code', activeProject.code)
      .order('date', { ascending: false })
    if (error) setDars(SEED.filter(d => d.project_code === activeProject.code))
    else setDars(data.map(d => ({ ...d, activities: d.activities || [], labour: d.labour || [], equipment: d.equipment || [], visitors: d.visitors || [], issues: d.issues || [] })))
    setLoading(false)
  }

  function openNew() {
    setEditItem(null)
    setForm({ ...BLANK_DAR, prepared_by: profile?.name || '', activities: [], labour: [], equipment: [], visitors: [], issues: [] })
    setShowForm(true)
  }

  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function setField(f, v) { setForm(p => ({ ...p, [f]: v })) }
  function toggleSection(s) { setExpandedSections(p => ({ ...p, [s]: !p[s] })) }

  // Array field helpers
  function addRow(field, blank) { setForm(p => ({ ...p, [field]: [...(p[field] || []), { ...blank }] })) }
  function updateRow(field, idx, key, val) {
    setForm(p => {
      const arr = [...(p[field] || [])]
      arr[idx] = { ...arr[idx], [key]: val }
      return { ...p, [field]: arr }
    })
  }
  function removeRow(field, idx) {
    setForm(p => ({ ...p, [field]: (p[field] || []).filter((_, i) => i !== idx) }))
  }

  async function save(submitStatus) {
    const saveData = { ...form, status: submitStatus || form.status, project_code: activeProject.code }
    if (editItem) {
      await supabase.from('dars').update(saveData).eq('id', editItem.id)
      setDars(prev => prev.map(d => d.id === editItem.id ? { ...d, ...saveData } : d))
      toast('DAR updated ✓', 'ok')
    } else {
      const seq = dars.filter(d => d.project_code === activeProject.code).length + 1
      const dar_number = generateNumber(activeProject.project_code || activeProject.code, 'DAR', seq)
      const item = { ...saveData, dar_number }
      const { data } = await supabase.from('dars').insert(item).select().single()
      setDars(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`DAR created: ${dar_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = dars.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.dar_number, d.date, d.prepared_by, d.general_remarks].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const totalLabour = (form.labour || []).reduce((s, l) => s + (parseInt(l.count) || 0), 0)

  function SectionHeader({ label, field, count }) {
    return (
      <div onClick={() => toggleSection(field)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', marginBottom: expandedSections[field] ? 12 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)' }}>
          {label} {count > 0 && <span style={{ background: 'var(--brand-accent)', color: 'var(--brand-primary)', borderRadius: 20, padding: '1px 7px', fontSize: 10, marginLeft: 6 }}>{count}</span>}
        </span>
        {expandedSections[field] ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </div>
    )
  }

  const handlePrint = (d) => {
    const merged = { ...d, companyLogo: d.companyLogo || activeProject?.client_logo || '' }
    printForm(buildDAR(merged), `DAR_${d.filename || 'DAR'}`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Daily Activity Report</div>
          <div className="page-subtitle">{activeProject.project_name || activeProject.name} · {dars.length} reports</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New DAR</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search DAR number, date, prepared by…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No DARs found.</div> : (
          <table>
            <thead>
              <tr>
                <th>DAR No.</th><th>Date</th><th>Shift</th><th>Weather</th>
                <th>Activities</th><th>Labour</th><th>Prepared By</th>
                <th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.dar_number}</span></td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{d.date}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.shift}</td>
                  <td style={{ fontSize: 12 }}>{d.weather}{d.temperature ? ` · ${d.temperature}°C` : ''}</td>
                  <td style={{ fontSize: 12 }}>{(d.activities || []).length} activit{(d.activities || []).length === 1 ? 'y' : 'ies'}</td>
                  <td style={{ fontSize: 12 }}>{(d.labour || []).reduce((s, l) => s + (parseInt(l.count) || 0), 0)} workers</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.prepared_by}</td>
                  <td><Badge status={d.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                      <button className="btn btn-ghost" style={{ padding: '3px 6px' }} title="Print DAR" onClick={() => handlePrint(d)}><Printer size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DAR Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit DAR — ${editItem.dar_number}` : 'New Daily Activity Report'} size="lg"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-secondary" onClick={() => save(STATUS.DRAFT)}>Save Draft</button>
            {canApprove && form.status === STATUS.SUBMITTED && (
              <button className="btn" style={{ background: 'var(--status-approved-bg)', color: 'var(--status-approved-text)', fontWeight: 700 }} onClick={() => save(STATUS.APPROVED)}>✓ Approve</button>
            )}
            <button className="btn btn-primary" onClick={() => save(STATUS.SUBMITTED)}>Submit</button>
          </div>
        }>
        <div>
          {/* Header */}
          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label required">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Shift</label>
              <select className="form-select" value={form.shift} onChange={e => setField('shift', e.target.value)}>
                {SHIFT.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Weather</label>
              <select className="form-select" value={form.weather} onChange={e => setField('weather', e.target.value)}>
                {WEATHER.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Temperature (°C)</label>
              <input className="form-input" type="number" value={form.temperature} onChange={e => setField('temperature', e.target.value)} placeholder="28" />
            </div>
            <div className="form-group">
              <label className="form-label">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={e => setField('prepared_by', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Reviewed By</label>
              <input className="form-input" value={form.reviewed_by} onChange={e => setField('reviewed_by', e.target.value)} />
            </div>
          </div>

          {/* Activities */}
          <SectionHeader label="Site Activities" field="activities" count={(form.activities || []).length} />
          {expandedSections.activities && (
            <div style={{ marginBottom: 20 }}>
              {(form.activities || []).map((a, i) => (
                <div key={i} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 10 }}>
                  <div className="form-grid form-grid-3" style={{ gap: 10, marginBottom: 8 }}>
                    <div className="form-group">
                      <label className="form-label">Activity ID</label>
                      <input className="form-input" value={a.activity_id} onChange={e => updateRow('activities', i, 'activity_id', e.target.value)} placeholder="A1010" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Activity Name</label>
                      <input className="form-input" value={a.activity_name} onChange={e => updateRow('activities', i, 'activity_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Discipline</label>
                      <select className="form-select" value={a.discipline} onChange={e => updateRow('activities', i, 'discipline', e.target.value)}>
                        <option value="">— Select —</option>
                        {disciplines.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input className="form-input" value={a.location} onChange={e => updateRow('activities', i, 'location', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Zone</label>
                      <input className="form-input" value={a.zone} onChange={e => updateRow('activities', i, 'zone', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">WBS Code</label>
                      <input className="form-input" value={a.wbs_code} onChange={e => updateRow('activities', i, 'wbs_code', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-grid form-grid-4" style={{ gap: 10, marginBottom: 8 }}>
                    <div className="form-group">
                      <label className="form-label">Planned Qty</label>
                      <input className="form-input" type="number" value={a.planned_qty} onChange={e => updateRow('activities', i, 'planned_qty', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Actual Qty</label>
                      <input className="form-input" type="number" value={a.actual_qty} onChange={e => updateRow('activities', i, 'actual_qty', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit</label>
                      <input className="form-input" value={a.unit} onChange={e => updateRow('activities', i, 'unit', e.target.value)} placeholder="CUM / SQM" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Progress %</label>
                      <input className="form-input" type="number" min="0" max="100" value={a.progress_pct} onChange={e => updateRow('activities', i, 'progress_pct', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Description / Remarks</label>
                      <input className="form-input" value={a.description} onChange={e => updateRow('activities', i, 'description', e.target.value)} placeholder="Work done today…" />
                    </div>
                    <button className="btn btn-ghost" style={{ marginTop: 18, color: 'var(--status-rejected-text)', padding: '6px 10px' }} onClick={() => removeRow('activities', i)}>✕</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addRow('activities', BLANK_ACTIVITY)}><Plus size={12} /> Add Activity</button>
            </div>
          )}

          {/* Labour */}
          <SectionHeader label={`Labour${totalLabour > 0 ? ` — ${totalLabour} total` : ''}`} field="labour" count={(form.labour || []).length} />
          {expandedSections.labour && (
            <div style={{ marginBottom: 20 }}>
              {(form.labour || []).map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">Trade</label>
                    <input className="form-input" value={l.trade} onChange={e => updateRow('labour', i, 'trade', e.target.value)} placeholder="Concretor" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sub-contractor</label>
                    <input className="form-input" value={l.subcontractor} onChange={e => updateRow('labour', i, 'subcontractor', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Count</label>
                    <input className="form-input" type="number" min="0" value={l.count} onChange={e => updateRow('labour', i, 'count', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Remarks</label>
                    <input className="form-input" value={l.remarks} onChange={e => updateRow('labour', i, 'remarks', e.target.value)} />
                  </div>
                  <button className="btn btn-ghost" style={{ color: 'var(--status-rejected-text)', padding: '6px 8px', marginBottom: 1 }} onClick={() => removeRow('labour', i)}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addRow('labour', BLANK_LABOUR)}><Plus size={12} /> Add Labour</button>
            </div>
          )}

          {/* Equipment */}
          <SectionHeader label="Plant & Equipment" field="equipment" count={(form.equipment || []).length} />
          {expandedSections.equipment && (
            <div style={{ marginBottom: 20 }}>
              {(form.equipment || []).map((e, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 120px 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">Equipment Type</label>
                    <input className="form-input" value={e.type} onChange={ev => updateRow('equipment', i, 'type', ev.target.value)} placeholder="Mobile Crane" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ID / Plate</label>
                    <input className="form-input" value={e.id_number} onChange={ev => updateRow('equipment', i, 'id_number', ev.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qty</label>
                    <input className="form-input" type="number" min="1" value={e.quantity} onChange={ev => updateRow('equipment', i, 'quantity', ev.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={e.status} onChange={ev => updateRow('equipment', i, 'status', ev.target.value)}>
                      {['Working', 'Idle', 'Under Repair', 'Standby'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Remarks</label>
                    <input className="form-input" value={e.remarks} onChange={ev => updateRow('equipment', i, 'remarks', ev.target.value)} />
                  </div>
                  <button className="btn btn-ghost" style={{ color: 'var(--status-rejected-text)', padding: '6px 8px', marginBottom: 1 }} onClick={() => removeRow('equipment', i)}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addRow('equipment', BLANK_EQUIPMENT)}><Plus size={12} /> Add Equipment</button>
            </div>
          )}

          {/* Visitors */}
          <SectionHeader label="Visitors" field="visitors" count={(form.visitors || []).length} />
          {expandedSections.visitors && (
            <div style={{ marginBottom: 20 }}>
              {(form.visitors || []).map((v, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 80px auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={v.name} onChange={e => updateRow('visitors', i, 'name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company</label>
                    <input className="form-input" value={v.company} onChange={e => updateRow('visitors', i, 'company', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purpose</label>
                    <input className="form-input" value={v.purpose} onChange={e => updateRow('visitors', i, 'purpose', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time In</label>
                    <input className="form-input" type="time" value={v.time_in} onChange={e => updateRow('visitors', i, 'time_in', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Out</label>
                    <input className="form-input" type="time" value={v.time_out} onChange={e => updateRow('visitors', i, 'time_out', e.target.value)} />
                  </div>
                  <button className="btn btn-ghost" style={{ color: 'var(--status-rejected-text)', padding: '6px 8px', marginBottom: 1 }} onClick={() => removeRow('visitors', i)}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addRow('visitors', BLANK_VISITOR)}><Plus size={12} /> Add Visitor</button>
            </div>
          )}

          {/* Issues */}
          <SectionHeader label="Issues / Observations" field="issues" count={(form.issues || []).length} />
          {expandedSections.issues && (
            <div style={{ marginBottom: 20 }}>
              {(form.issues || []).map((iss, i) => (
                <div key={i} style={{ background: 'var(--status-rejected-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: 12, marginBottom: 8 }}>
                  <div className="form-grid form-grid-2" style={{ gap: 8, marginBottom: 8 }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Issue Description</label>
                      <input className="form-input" value={iss.description} onChange={e => updateRow('issues', i, 'description', e.target.value)} placeholder="Describe the issue or observation…" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Raised By</label>
                      <input className="form-input" value={iss.raised_by} onChange={e => updateRow('issues', i, 'raised_by', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={iss.status} onChange={e => updateRow('issues', i, 'status', e.target.value)}>
                        {['Open', 'In Progress', 'Closed'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Action Required</label>
                      <input className="form-input" value={iss.action_required} onChange={e => updateRow('issues', i, 'action_required', e.target.value)} />
                    </div>
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 11, color: 'var(--status-rejected-text)' }} onClick={() => removeRow('issues', i)}>Remove Issue</button>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addRow('issues', BLANK_ISSUE)}><Plus size={12} /> Add Issue</button>
            </div>
          )}

          {/* General Remarks */}
          <div className="form-group">
            <label className="form-label">General Remarks</label>
            <textarea className="form-textarea" value={form.general_remarks} onChange={e => setField('general_remarks', e.target.value)} rows={3} placeholder="Overall summary of the day's activities…" />
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
